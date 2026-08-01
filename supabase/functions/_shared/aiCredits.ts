// Credit metering shared by every AI Edge Function. Enforces the unified aiCreditsPerMonth
// pool from src/lib/subscription-limits.ts (see docs/AI_ARCHITECTURE.md §7).
//
// IMPORTANT: PLAN_AI_CREDITS below must be kept in sync with `PLAN_LIMITS[*].aiCreditsPerMonth`
// in src/lib/subscription-limits.ts. This duplication mirrors an existing pattern already in
// this codebase (Stripe plan/price mappings are similarly duplicated across constants.ts,
// subscription-limits.ts, and check-subscription/index.ts's own PLAN_MAPPING) rather than
// introducing a new cross-runtime config-sharing mechanism for four small numbers.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export type PlanType = "free" | "pro_monthly" | "pro_annual" | "lifetime";
export type AiUsageKind = "description" | "translation" | "optimizer_run" | "import" | "copilot" | "insights";

export const PLAN_AI_CREDITS: Record<PlanType, number> = {
  free: 20,
  pro_monthly: 300,
  pro_annual: 500,
  lifetime: 1000,
};

// Must be kept in sync with AI_CREDIT_COSTS in src/lib/subscription-limits.ts.
export const AI_CREDIT_COSTS: Record<AiUsageKind, number> = {
  description: 1,
  translation: 1,
  optimizer_run: 3,
  import: 15,
  copilot: 2,
  insights: 3,
};

export interface CreditCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  cost: number;
}

/**
 * Looks up the restaurant's plan, sums credits already used this billing period (via the
 * get_ai_credits_used_this_period SQL function from the Phase 0 migration), and reports
 * whether `kind` can be charged without exceeding the plan's pool.
 */
export async function checkAiCredits(
  supabaseUser: SupabaseClient,
  restaurantId: string,
  kind: AiUsageKind,
): Promise<CreditCheckResult> {
  const cost = AI_CREDIT_COSTS[kind];

  const { data: subscription } = await supabaseUser
    .from("subscriptions")
    .select("plan")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  const plan = (subscription?.plan as PlanType | undefined) ?? "free";
  const limit = PLAN_AI_CREDITS[plan] ?? PLAN_AI_CREDITS.free;

  const { data: used, error } = await supabaseUser.rpc("get_ai_credits_used_this_period", {
    _restaurant_id: restaurantId,
  });
  if (error) throw error;

  const usedCount = typeof used === "number" ? used : 0;
  return { allowed: usedCount + cost <= limit, used: usedCount, limit, cost };
}

/**
 * Debits the ledger after a successful AI operation. Must run through the service-role
 * client — ai_usage has no client-writable RLS policy by design (see the Phase 0 migration).
 */
export async function chargeAiCredits(
  supabaseService: SupabaseClient,
  restaurantId: string,
  kind: AiUsageKind,
  opts?: { aiJobId?: string; metadata?: Record<string, unknown> },
): Promise<void> {
  const { error } = await supabaseService.from("ai_usage").insert({
    restaurant_id: restaurantId,
    kind,
    credits_charged: AI_CREDIT_COSTS[kind],
    ai_job_id: opts?.aiJobId ?? null,
    metadata: opts?.metadata ?? {},
  });
  if (error) throw error;
}
