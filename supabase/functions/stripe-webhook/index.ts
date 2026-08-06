import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

type Db = SupabaseClient<any, "public", "public", any, any>;

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Price/Product mapping for Sa Carta. Mirrors check-subscription / sync-subscription.
const PLAN_MAPPING: Record<string, { plan: string; photos: number; languages: number }> = {
  "price_1SikkXCZS330jw8u1e7cOKrQ": { plan: "pro_monthly", photos: 50, languages: 10 },
  "price_1SikkrCZS330jw8uTxFrG8c3": { plan: "pro_annual", photos: 50, languages: 10 },
  "price_1Sikn6CZS330jw8uv7g6gUs9": { plan: "lifetime", photos: 999, languages: 999 },
};

const FREE = { plan: "free", photos: 0, languages: 1 };

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function planForPrice(priceId: string | null): { plan: string; photos: number; languages: number } {
  if (!priceId) return FREE;
  return PLAN_MAPPING[priceId] ?? FREE;
}

function asString(value: string | Stripe.Customer | Stripe.Subscription | null | undefined): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) return value.id as string;
  return null;
}

function supabaseClient(): Db {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

serve(async (req) => {
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    logStep("ERROR: STRIPE_WEBHOOK_SECRET not configured");
    return json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, 500);
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    logStep("ERROR: STRIPE_SECRET_KEY not configured");
    return json({ error: "STRIPE_SECRET_KEY not configured" }, 500);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = supabaseClient();

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  // Verify the Stripe signature. Anything that fails here is not from Stripe.
  // constructEventAsync is required: the synchronous constructEvent uses a sync HMAC
  // that throws in the Deno (esm.sh denonext) runtime.
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature ?? "", webhookSecret);
  } catch (error) {
    logStep("Invalid signature", { message: error instanceof Error ? error.message : String(error) });
    return json({ error: "Invalid signature" }, 400);
  }

  // Idempotency: skip events already processed. The ledger's primary key is the race
  // safety net: if two deliveries arrive concurrently, only one insert wins.
  const { data: existing } = await supabase
    .from("stripe_webhook_events")
    .select("event_id")
    .eq("event_id", event.id)
    .maybeSingle();

  if (existing) {
    logStep("Duplicate event skipped", { eventId: event.id });
    return json({ received: true, duplicate: true });
  }

  const { error: claimError } = await supabase
    .from("stripe_webhook_events")
    .insert({ event_id: event.id });

  if (claimError) {
    if (claimError.code === "23505") {
      // Unique violation: a concurrent delivery already processed this event.
      logStep("Concurrent duplicate skipped", { eventId: event.id });
      return json({ received: true, duplicate: true });
    }
    logStep("Idempotency claim failed", { message: claimError.message });
    return json({ error: claimError.message }, 500);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(stripe, supabase, session);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceStatus(supabase, invoice, "past_due");
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceStatus(supabase, invoice, "active");
        break;
      }
      default:
        logStep("Unhandled event type", { type: event.type });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("Processing failed, releasing claim for retry", { message });
    await supabase.from("stripe_webhook_events").delete().eq("event_id", event.id);
    return json({ error: message }, 500);
  }

  logStep("Event processed", { eventId: event.id, type: event.type });
  return json({ received: true });
});

async function findRestaurantId(
  supabase: Db,
  opts: { stripeSubscriptionId: string | null; stripeCustomerId: string | null },
): Promise<string | null> {
  if (opts.stripeSubscriptionId) {
    const { data } = await supabase
      .from("subscriptions")
      .select("restaurant_id")
      .eq("stripe_subscription_id", opts.stripeSubscriptionId)
      .maybeSingle();
    if (data) return data.restaurant_id as string;
  }
  if (opts.stripeCustomerId) {
    const { data } = await supabase
      .from("subscriptions")
      .select("restaurant_id")
      .eq("stripe_customer_id", opts.stripeCustomerId)
      .maybeSingle();
    if (data) return data.restaurant_id as string;
  }
  return null;
}

async function hasManualOverride(supabase: Db, restaurantId: string): Promise<boolean> {
  const { data } = await supabase
    .from("subscriptions")
    .select("manual_override")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  return !!data?.manual_override;
}

async function applyPlan(
  supabase: Db,
  restaurantId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("subscriptions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("restaurant_id", restaurantId);
  if (error) throw new Error(`Failed to update subscription: ${error.message}`);
}

async function handleCheckoutCompleted(
  stripe: Stripe,
  supabase: Db,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.client_reference_id ?? session.metadata?.user_id ?? null;
  if (!userId) {
    logStep("checkout.session.completed: no user id, skipping", { sessionId: session.id });
    return;
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  if (!restaurant) {
    logStep("checkout.session.completed: no restaurant for user, skipping", { userId });
    return;
  }

  if (await hasManualOverride(supabase, restaurant.id)) {
    logStep("checkout.session.completed: manual override, skipping", { restaurantId: restaurant.id });
    return;
  }

  const customerId = asString(session.customer);
  let subscriptionId: string | null = asString(session.subscription);

  // Resolve the purchased plan from the actual line item.
  let plan = FREE;
  let status = "active";
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  let cancelAtPeriodEnd = false;

  if (session.mode === "payment") {
    // One-time lifetime purchase.
    plan = PLAN_MAPPING["price_1Sikn6CZS330jw8uv7g6gUs9"];
  } else if (session.mode === "subscription") {
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      subscriptionId = subscription.id;
      status = subscription.status;
      plan = planForPrice(subscription.items.data[0]?.price.id ?? null);
      periodStart = new Date(subscription.current_period_start * 1000).toISOString();
      periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      cancelAtPeriodEnd = subscription.cancel_at_period_end;
    }
  }

  await applyPlan(supabase, restaurant.id, {
    plan: plan.plan,
    photos_limit: plan.photos,
    languages_limit: plan.languages,
    status,
    is_lifetime: plan.plan === "lifetime",
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: cancelAtPeriodEnd,
  });
  logStep("checkout.session.completed: plan applied", { userId, plan: plan.plan });
}

async function handleSubscriptionUpdated(
  supabase: Db,
  subscription: Stripe.Subscription,
): Promise<void> {
  const subId = subscription.id;
  const customerId = asString(subscription.customer);

  const restaurantId = await findRestaurantId(supabase, {
    stripeSubscriptionId: subId,
    stripeCustomerId: customerId,
  });
  if (!restaurantId) {
    logStep("subscription.updated: no matching restaurant, skipping", { subId });
    return;
  }
  if (await hasManualOverride(supabase, restaurantId)) {
    logStep("subscription.updated: manual override, skipping", { restaurantId });
    return;
  }

  const canceled =
    subscription.status === "canceled" ||
    subscription.status === "unpaid" ||
    subscription.status === "incomplete_expired";

  if (canceled) {
    await applyPlan(supabase, restaurantId, {
      plan: "free",
      photos_limit: 0,
      languages_limit: 1,
      status: "canceled",
      is_lifetime: false,
      stripe_subscription_id: subId,
      stripe_customer_id: customerId,
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
    });
    logStep("subscription.updated: downgraded to free", { subId });
    return;
  }

  const plan = planForPrice(subscription.items.data[0]?.price.id ?? null);
  await applyPlan(supabase, restaurantId, {
    plan: plan.plan,
    photos_limit: plan.photos,
    languages_limit: plan.languages,
    status: subscription.status === "past_due" ? "past_due" : "active",
    is_lifetime: plan.plan === "lifetime",
    stripe_subscription_id: subId,
    stripe_customer_id: customerId,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
  });
  logStep("subscription.updated: plan synced", { subId, plan: plan.plan });
}

async function handleSubscriptionDeleted(
  supabase: Db,
  subscription: Stripe.Subscription,
): Promise<void> {
  const subId = subscription.id;
  const customerId = asString(subscription.customer);

  const restaurantId = await findRestaurantId(supabase, {
    stripeSubscriptionId: subId,
    stripeCustomerId: customerId,
  });
  if (!restaurantId) {
    logStep("subscription.deleted: no matching restaurant, skipping", { subId });
    return;
  }
  if (await hasManualOverride(supabase, restaurantId)) {
    logStep("subscription.deleted: manual override, skipping", { restaurantId });
    return;
  }

  await applyPlan(supabase, restaurantId, {
    plan: "free",
    photos_limit: 0,
    languages_limit: 1,
    status: "canceled",
    is_lifetime: false,
    stripe_subscription_id: subId,
    stripe_customer_id: customerId,
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
  });
  logStep("subscription.deleted: downgraded to free", { subId });
}

async function handleInvoiceStatus(
  supabase: Db,
  invoice: Stripe.Invoice,
  status: "active" | "past_due",
): Promise<void> {
  const subId = asString(invoice.subscription);
  const customerId = asString(invoice.customer);

  const restaurantId = await findRestaurantId(supabase, {
    stripeSubscriptionId: subId,
    stripeCustomerId: customerId,
  });
  if (!restaurantId) {
    logStep("invoice event: no matching restaurant, skipping", { invoiceId: invoice.id });
    return;
  }
  if (await hasManualOverride(supabase, restaurantId)) {
    logStep("invoice event: manual override, skipping", { restaurantId });
    return;
  }

  const patch: Record<string, unknown> = { status };
  if (status === "active" && subId) {
    // Refresh the period from the live subscription so entitlement stays accurate.
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    const subscription = await stripe.subscriptions.retrieve(subId);
    patch.current_period_start = new Date(subscription.current_period_start * 1000).toISOString();
    patch.current_period_end = new Date(subscription.current_period_end * 1000).toISOString();
  }

  await applyPlan(supabase, restaurantId, patch);
  logStep("invoice event: status applied", { invoiceId: invoice.id, status });
}
