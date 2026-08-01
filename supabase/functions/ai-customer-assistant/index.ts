// AI Customer Assistant (Phase 8) — anonymous chat on the public menu page (/m/:slug).
//
// Safety-critical design (docs/FEATURE_SPECIFICATIONS.md §Phase 8):
//   * No auth wall. The frontend mints a session token (crypto.randomUUID, persisted in
//     localStorage) on first message; the function derives a salted IP hash server-side.
//   * RATE LIMITS are checked BEFORE any LLM call: per (restaurant, session_token) hour cap,
//     per (restaurant, ip_hash) session-cycling guard, and a per-restaurant daily cap tied to
//     the owner's plan tier. On any limit hit we answer a friendly "busy" message and never
//     call the provider.
//   * Read-only, anon access to the restaurant's already-public menu rows.
//   * Deterministic pre-filter (no LLM) enforces hard constraints; the LLM only ranks within
//     the surviving candidate set; server-side validation drops hallucinated item ids.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";
import { jsonResponse } from "../_shared/aiAuth.ts";
import { getProviderForFeature } from "../../../packages/ai/providers/registry.ts";
import {
  extractConstraints,
  filterCandidates,
  rankCandidates,
  validateRecommendations,
  type MenuItemCandidate,
} from "../../../packages/ai/agents/customerAssistantAgent.ts";

// Must be kept in sync with PlanLimits.aiCustomerAssistantEnabled in
// src/lib/subscription-limits.ts (mirrors the existing cross-runtime duplication pattern).
const ASSISTANT_ENABLED_PLANS = ["pro_monthly", "pro_annual", "lifetime"];

// Per-restaurant daily caps (a lever per plan, not hardcoded deeper):
const DAILY_CAP_BY_PLAN: Record<string, number> = {
  free: 0,
  pro_monthly: 150,
  pro_annual: 300,
  lifetime: 600,
};

const SESSION_HOURLY_CAP = 20;
const IP_HOURLY_CAP = 60;
const SALT = "sacarta-anon-chat-v1"; // for IP hashing; rotation just resets rate buckets

interface RequestBody {
  slug?: string;
  sessionToken?: string;
  message?: string;
}

interface RestaurantCtx {
  id: string;
  name: string;
  currency: string;
  plan: string;
}

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// Simple, dependency-free salted hash (sha-256 via Web Crypto). Good enough for a rate-limit
// bucket key — the raw IP is never stored.
async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`${SALT}:${ip}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(buf);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const body = (await req.json()) as RequestBody;
    if (!body.slug || !body.message?.trim() || !body.sessionToken) {
      return jsonResponse({ error: "slug, sessionToken and message are required" }, 400);
    }

    // Resolve the restaurant from its public slug and load its plan for gating + daily cap.
    const { data: restaurant, error: restError } = await supabase
      .from("restaurants")
      .select("id, name, currency")
      .eq("slug", body.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (restError) throw restError;
    if (!restaurant) return jsonResponse({ error: "Menu not found" }, 404);

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();
    const plan = (subscription?.plan as string | undefined) ?? "free";

    const ctx: RestaurantCtx = {
      id: restaurant.id,
      name: restaurant.name,
      currency: restaurant.currency ?? "EUR",
      plan,
    };

    if (!ASSISTANT_ENABLED_PLANS.includes(plan)) {
      return jsonResponse({
        reply: "Este restaurante todavía no ha activado el asistente inteligente. 🍽️",
        recommendations: [],
        rateLimited: false,
      });
    }

    const ipHash = await hashIp(clientIp(req));

    // Rate limits — checked strictly before any LLM call.
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { count: sessionHourCount } = await supabase
      .from("anon_chat_events")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", ctx.id)
      .eq("session_token", body.sessionToken)
      .gte("created_at", hourAgo);

    const { count: ipHourCount } = await supabase
      .from("anon_chat_events")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", ctx.id)
      .eq("ip_hash", ipHash)
      .gte("created_at", hourAgo);

    const { count: restaurantDayCount } = await supabase
      .from("anon_chat_events")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", ctx.id)
      .gte("created_at", dayAgo);

    const dailyCap = DAILY_CAP_BY_PLAN[plan] ?? 0;
    const limited =
      (sessionHourCount ?? 0) >= SESSION_HOURLY_CAP ||
      (ipHourCount ?? 0) >= IP_HOURLY_CAP ||
      (restaurantDayCount ?? 0) >= dailyCap;

    if (limited) {
      // Record the rejected attempt so the bucket fills (prevents hammering) then answer busy.
      await supabase.from("anon_chat_events").insert({
        restaurant_id: ctx.id,
        session_token: body.sessionToken,
        ip_hash: ipHash,
      });
      return jsonResponse({
        reply: "¡Uy! He recibido demasiados mensajes en poco tiempo. Vuelve a intentarlo en un rato. 😊",
        recommendations: [],
        rateLimited: true,
        rateLimitMessage: "Demasiados mensajes — intenta más tarde",
      });
    }

    // Record this message.
    await supabase.from("anon_chat_events").insert({
      restaurant_id: ctx.id,
      session_token: body.sessionToken,
      ip_hash: ipHash,
    });

    // Load the restaurant's public menu (active menus/categories/items only — same shape the
    // public menu page reads).
    const { data: menus } = await supabase
      .from("menus")
      .select("id")
      .eq("restaurant_id", ctx.id)
      .eq("is_active", true);
    const menuIds = (menus ?? []).map((m) => m.id);
    const { data: categories } = menuIds.length
      ? await supabase.from("categories").select("id, name").in("menu_id", menuIds).eq("is_active", true)
      : { data: [] };
    const categoryMap = new Map<string, string>((categories ?? []).map((c) => [c.id, c.name]));
    const categoryIds = [...categoryMap.keys()];

    const { data: items } = categoryIds.length
      ? await supabase
        .from("items")
        .select("id, name, price, description, is_active, is_vegan, is_vegetarian, is_spicy, is_gluten_free, allergens, category_id")
        .in("category_id", categoryIds)
      : { data: [] };

    const menuItems: MenuItemCandidate[] = (items ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      description: item.description,
      category_name: categoryMap.get(item.category_id) ?? "",
      is_active: item.is_active,
      is_vegan: item.is_vegan ?? false,
      is_vegetarian: item.is_vegetarian ?? false,
      is_spicy: item.is_spicy ?? false,
      is_gluten_free: item.is_gluten_free ?? false,
      allergens: item.allergens ?? [],
    }));

    const provider = getProviderForFeature("customer_assistant");

    // 1. Parse constraints (LLM, non-safety-critical).
    const constraints = await extractConstraints(provider, body.message, ctx.name);

    // 2. Deterministic pre-filter (pure code, no LLM).
    const candidates = filterCandidates(menuItems, constraints);

    if (candidates.length === 0) {
      return jsonResponse({
        reply:
          "No encuentro platos en el menú que cumplan con todas tus restricciones. Prueba a relajar alguna condición (por ejemplo el precio o el picante).",
        recommendations: [],
        rateLimited: false,
      });
    }

    // 3. Rank within the pre-filtered set only.
    const ranking = await rankCandidates(provider, {
      restaurantName: ctx.name,
      currency: ctx.currency,
      mood_or_craving: constraints.mood_or_craving ?? null,
      candidates,
    });

    // 4. Server-side hallucination safety net.
    const valid = validateRecommendations(ranking.recommendations, candidates);
    const reply = ranking.reply || buildDefaultReply(valid);

    return jsonResponse({
      reply,
      recommendations: valid.map((r) => ({
        item_id: r.item_id,
        name: r.name,
        price: r.price,
        explanation: r.explanation,
      })),
      rateLimited: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ai-customer-assistant] ERROR", message);
    return jsonResponse({ error: message }, 500);
  }
});

function buildDefaultReply(recs: { name: string; price: number | null }[]): string {
  if (recs.length === 0) return "No he encontrado opciones que encajen, pero puedo volver a intentarlo con otras condiciones.";
  return `Te recomiendo ${recs.map((r) => r.name).join(", ")}.`;
}
