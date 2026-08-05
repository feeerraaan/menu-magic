// Superadmin coupon backoffice. Caller must hold the 'admin' role (checked via the
// has_role SECURITY DEFINER function with the caller's own JWT). Creates/lists/deactivates
// Stripe promotion codes backed by one-time percentage coupons. Mirrors the client-side
// behaviour of the dashboard Stripe setup (same API version as create-checkout).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticate, jsonResponse } from "../_shared/aiAuth.ts";

const DAY_MS = 86_400_000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticate(req);
    if ("response" in auth) return auth.response;
    const { userId, supabaseUser } = auth;

    const { data: isAdmin, error: roleError } = await supabaseUser.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) return jsonResponse({ error: "Forbidden" }, 403);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const body = (await req.json()) as Record<string, unknown>;
    const action = body.action;

    if (action === "list_coupons") {
      const codes = await stripe.promotionCodes.list({ limit: 50 });
      const coupons = [];
      for (const pc of codes.data) {
        const couponId = pc.promotion?.coupon;
        const coupon = couponId ? await stripe.coupons.retrieve(couponId) : null;
        coupons.push({
          id: pc.id,
          code: pc.code,
          active: pc.active,
          times_redeemed: pc.times_redeemed,
          max_redemptions: pc.max_redemptions,
          percent_off: coupon?.percent_off ?? null,
          amount_off: coupon?.amount_off ?? null,
          currency: coupon?.currency ?? null,
          expires_at: pc.expires_at ?? null,
        });
      }
      return jsonResponse({ coupons });
    }

    if (action === "create_coupon") {
      const code = String(body.code ?? "").trim().toUpperCase();
      const percentOff = Number(body.percent_off);
      const maxRedemptions = Number(body.max_redemptions ?? 0);
      const expiresDays = Number(body.expires_days ?? 0);

      if (!code || !Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
        return jsonResponse({ error: "Código y un porcentaje (1-100) son obligatorios" }, 400);
      }
      const redeemBy = expiresDays > 0
        ? Math.floor((Date.now() + expiresDays * DAY_MS) / 1000)
        : undefined;

      const coupon = await stripe.coupons.create({
        percent_off: percentOff,
        duration: "once",
        currency: "eur",
        max_redemptions: maxRedemptions > 0 ? maxRedemptions : undefined,
        redeem_by: redeemBy,
        name: code,
      });
      const pc = await stripe.promotionCodes.create({
        coupon: coupon.id,
        code,
        active: true,
        max_redemptions: maxRedemptions > 0 ? maxRedemptions : undefined,
        expires_at: redeemBy,
      });
      return jsonResponse({ id: pc.id, code: pc.code, percent_off: percentOff });
    }

    if (action === "deactivate_coupon") {
      const id = String(body.id ?? "");
      if (!id) return jsonResponse({ error: "id es obligatorio" }, 400);
      const pc = await stripe.promotionCodes.update(id, { active: false });
      return jsonResponse({ id: pc.id, active: pc.active });
    }

    return jsonResponse({ error: "Acción desconocida" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[admin-coupons] ERROR", message);
    return jsonResponse({ error: message }, 500);
  }
});
