import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Price/Product mapping for SaCarta
const PLAN_MAPPING: Record<string, { plan: string; photos: number; languages: number }> = {
  "price_1SheAFCgFIHkYWstnfLIdA3W": { plan: "pro_monthly", photos: 50, languages: 10 },
  "price_1SheAQCgFIHkYWstrVsgPJQN": { plan: "pro_annual", photos: 50, languages: 10 },
  "price_1SheAjCgFIHkYWstGofwVV2K": { plan: "lifetime", photos: 999, languages: 999 },
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

    // Get user from auth header
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

    // Get user's restaurant
    const { data: restaurant, error: restError } = await supabaseClient
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (restError || !restaurant) {
      logStep("No restaurant found for user");
      return new Response(JSON.stringify({ error: "No restaurant found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    logStep("Found restaurant", { restaurantId: restaurant.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found - keeping free plan");
      return new Response(JSON.stringify({ 
        success: true, 
        plan: "free",
        message: "No Stripe customer found" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for lifetime purchase first
    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 100,
    });

    const lifetimePriceId = "price_1SheAjCgFIHkYWstGofwVV2K";
    let isLifetime = false;

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
      // Update subscription to lifetime
      const { error: updateError } = await supabaseClient
        .from('subscriptions')
        .update({
          plan: 'lifetime',
          status: 'active',
          is_lifetime: true,
          photos_limit: 100,
          languages_limit: 10,
          stripe_customer_id: customerId,
          current_period_start: new Date().toISOString(),
          current_period_end: null,
          cancel_at_period_end: false,
        })
        .eq('restaurant_id', restaurant.id);

      if (updateError) {
        logStep("Error updating subscription", { error: updateError.message });
        throw new Error(`Failed to update subscription: ${updateError.message}`);
      }

      logStep("Updated subscription to lifetime");
      return new Response(JSON.stringify({
        success: true,
        plan: "lifetime",
        is_lifetime: true,
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
      logStep("No active subscription found - setting to free");
      
      const { error: updateError } = await supabaseClient
        .from('subscriptions')
        .update({
          plan: 'free',
          status: 'active',
          is_lifetime: false,
          photos_limit: 0,
          languages_limit: 1,
          stripe_customer_id: customerId,
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
        })
        .eq('restaurant_id', restaurant.id);

      if (updateError) {
        logStep("Error updating subscription", { error: updateError.message });
      }

      return new Response(JSON.stringify({
        success: true,
        plan: "free",
        is_lifetime: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0].price.id;
    const planInfo = PLAN_MAPPING[priceId] || { plan: "pro_monthly", photos: 50, languages: 10 };

    const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
    const subscriptionStart = new Date(subscription.current_period_start * 1000).toISOString();

    logStep("Active subscription found", { 
      subscriptionId: subscription.id, 
      plan: planInfo.plan,
      endDate: subscriptionEnd 
    });

    // Update the database subscription
    const { error: updateError } = await supabaseClient
      .from('subscriptions')
      .update({
        plan: planInfo.plan,
        status: 'active',
        is_lifetime: false,
        photos_limit: planInfo.photos,
        languages_limit: planInfo.languages,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        current_period_start: subscriptionStart,
        current_period_end: subscriptionEnd,
        cancel_at_period_end: subscription.cancel_at_period_end,
      })
      .eq('restaurant_id', restaurant.id);

    if (updateError) {
      logStep("Error updating subscription", { error: updateError.message });
      throw new Error(`Failed to update subscription: ${updateError.message}`);
    }

    logStep("Subscription synced successfully", { plan: planInfo.plan });

    return new Response(JSON.stringify({
      success: true,
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
