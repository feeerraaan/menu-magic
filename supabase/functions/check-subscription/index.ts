import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Price/Product mapping for Sa Carta
const PLAN_MAPPING: Record<string, { plan: string; photos: number; languages: number }> = {
  "price_1SikkXCZS330jw8u1e7cOKrQ": { plan: "pro_monthly", photos: 50, languages: 10 },
  "price_1SikkrCZS330jw8uTxFrG8c3": { plan: "pro_annual", photos: 50, languages: 10 },
  "price_1Sikn6CZS330jw8uv7g6gUs9": { plan: "lifetime", photos: 999, languages: 999 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get the user's restaurant and subscription
    const { data: restaurant } = await supabaseClient
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    // Check if there's a manual override - if so, don't touch the subscription
    if (restaurant) {
      const { data: existingSub } = await supabaseClient
        .from("subscriptions")
        .select("plan, photos_limit, languages_limit, is_lifetime, manual_override, current_period_end")
        .eq("restaurant_id", restaurant.id)
        .single();

      if (existingSub?.manual_override) {
        logStep("Manual override detected, skipping Stripe check", { plan: existingSub.plan });
        return new Response(JSON.stringify({
          subscribed: existingSub.plan !== "free",
          plan: existingSub.plan,
          is_lifetime: existingSub.is_lifetime,
          subscription_end: existingSub.current_period_end,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      // Update DB to free if we have a restaurant
      if (restaurant) {
        await supabaseClient
          .from("subscriptions")
          .update({ 
            plan: "free", 
            photos_limit: 0, 
            languages_limit: 1,
            is_lifetime: false,
            stripe_customer_id: null,
            stripe_subscription_id: null,
          })
          .eq("restaurant_id", restaurant.id);
        logStep("Updated DB to free plan");
      }
      return new Response(JSON.stringify({ 
        subscribed: false, 
        plan: "free",
        is_lifetime: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for lifetime purchase first (one-time payments)
    const lifetimePriceId = "price_1Sikn6CZS330jw8uv7g6gUs9";
    let isLifetime = false;
    
    // Check checkout sessions for successful lifetime purchases
    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 100,
    });
    
    for (const session of sessions.data) {
      if (session.payment_status === "paid" && session.mode === "payment") {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        for (const item of lineItems.data) {
          if (item.price?.id === lifetimePriceId) {
            isLifetime = true;
            logStep("Found lifetime purchase");
            break;
          }
        }
      }
      if (isLifetime) break;
    }

    if (isLifetime) {
      // Update DB to lifetime
      if (restaurant) {
        await supabaseClient
          .from("subscriptions")
          .update({ 
            plan: "lifetime", 
            photos_limit: 999, 
            languages_limit: 999,
            is_lifetime: true,
            stripe_customer_id: customerId,
          })
          .eq("restaurant_id", restaurant.id);
        logStep("Updated DB to lifetime plan");
      }
      return new Response(JSON.stringify({
        subscribed: true,
        plan: "lifetime",
        is_lifetime: true,
        subscription_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription found");
      // Update DB to free
      if (restaurant) {
        await supabaseClient
          .from("subscriptions")
          .update({ 
            plan: "free", 
            photos_limit: 0, 
            languages_limit: 1,
            is_lifetime: false,
            stripe_customer_id: customerId,
            stripe_subscription_id: null,
          })
          .eq("restaurant_id", restaurant.id);
        logStep("Updated DB to free plan");
      }
      return new Response(JSON.stringify({ 
        subscribed: false, 
        plan: "free",
        is_lifetime: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price?.id;
    const planInfo = priceId ? (PLAN_MAPPING[priceId] || { plan: "pro_monthly", photos: 50, languages: 10 }) : { plan: "pro_monthly", photos: 50, languages: 10 };
    const subscriptionEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;
    const subscriptionStart = subscription.current_period_start 
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : null;
    
    logStep("Active subscription found", { 
      subscriptionId: subscription.id, 
      plan: planInfo.plan, 
      endDate: subscriptionEnd 
    });

    // Update DB with subscription details
    if (restaurant) {
      await supabaseClient
        .from("subscriptions")
        .update({ 
          plan: planInfo.plan, 
          photos_limit: planInfo.photos, 
          languages_limit: planInfo.languages,
          is_lifetime: false,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          current_period_start: subscriptionStart,
          current_period_end: subscriptionEnd,
          cancel_at_period_end: subscription.cancel_at_period_end,
          status: "active",
        })
        .eq("restaurant_id", restaurant.id);
      logStep("Updated DB with subscription details", { plan: planInfo.plan });
    }

    return new Response(JSON.stringify({
      subscribed: true,
      plan: planInfo.plan,
      is_lifetime: false,
      subscription_end: subscriptionEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
