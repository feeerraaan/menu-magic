// AI Business Insights + Recommendations (Phase 7). Synchronous Edge Function that:
//   1. Authenticates the owner + checks credits (3 per run).
//   2. Creates an ai_jobs row (job_type 'business_insights') and runs the insights pipeline.
//   3. Stores the ephemeral narrative in ai_jobs.output and persists each recommendation as
//      a discrete, dismissible ai_recommendations row (service-role insert — the client only
//      reads + flips status, see the Phase 7 migration).
//   4. Charges ai_usage and returns the narrative + generated recommendations.
// The frontend re-fetches ai_recommendations for the lifecycle cards.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticate, jsonResponse } from "../_shared/aiAuth.ts";
import { checkAiCredits, chargeAiCredits, AI_CREDIT_COSTS } from "../_shared/aiCredits.ts";
import { getProviderForFeature } from "../../../packages/ai/providers/registry.ts";
import { runInsights, type RecommendationProposal } from "../../../packages/ai/pipelines/insightsPipeline.ts";

interface RequestBody {
  restaurantId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticate(req);
    if ("response" in auth) return auth.response;
    const { supabaseUser, supabaseService, userId } = auth;

    const body = (await req.json()) as RequestBody;
    if (!body.restaurantId) {
      return jsonResponse({ error: "restaurantId is required" }, 400);
    }

    const { data: restaurant, error: restaurantError } = await supabaseUser
      .from("restaurants")
      .select("id")
      .eq("id", body.restaurantId)
      .maybeSingle();
    if (restaurantError) throw restaurantError;
    if (!restaurant) return jsonResponse({ error: "Restaurant not found" }, 404);

    const creditCheck = await checkAiCredits(supabaseUser, body.restaurantId, "insights");
    if (!creditCheck.allowed) {
      return jsonResponse(
        { error: "AI credit limit reached for this plan", used: creditCheck.used, limit: creditCheck.limit },
        402,
      );
    }

    const { data: job, error: jobError } = await supabaseUser
      .from("ai_jobs")
      .insert({
        restaurant_id: body.restaurantId,
        created_by: userId,
        job_type: "business_insights",
        status: "processing",
        input: {},
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (jobError) throw jobError;
    const jobId = job.id as string;

    const provider = getProviderForFeature("insights");
    const result = await runInsights(supabaseUser, body.restaurantId, provider);

    // Persist discrete recommendation cards. Delete any stale 'open' cards from prior runs
    // so the list reflects the latest analysis (dismissed/actioned ones survive — that's the
    // point of the lifecycle; see FEATURE_SPECIFICATIONS.md §Phase 7).
    await supabaseService
      .from("ai_recommendations")
      .delete()
      .eq("restaurant_id", body.restaurantId)
      .eq("status", "open");

    for (const rec of result.recommendations) {
      const row = normalizeRecommendation(rec, body.restaurantId, jobId);
      await supabaseService.from("ai_recommendations").insert(row);
    }

    await chargeAiCredits(supabaseService, body.restaurantId, "insights", {
      aiJobId: jobId,
      metadata: { recommendationCount: result.recommendations.length },
    });

    await supabaseService
      .from("ai_jobs")
      .update({
        status: "completed",
        output: { narrative: result.narrative, generatedAt: new Date().toISOString() },
        progress: 100,
        ai_credits_charged: AI_CREDIT_COSTS.insights,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return jsonResponse({
      jobId,
      narrative: result.narrative,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ai-insights] ERROR", message);
    return jsonResponse({ error: message }, 500);
  }
});

function normalizeRecommendation(
  rec: RecommendationProposal,
  restaurantId: string,
  jobId: string,
): Record<string, unknown> {
  return {
    restaurant_id: restaurantId,
    ai_job_id: jobId,
    category: rec.category ?? 'general',
    target_type: rec.target_type ?? null,
    target_id: rec.target_id ?? null,
    title: rec.title,
    detail: rec.detail ?? null,
    status: 'open',
  };
}
