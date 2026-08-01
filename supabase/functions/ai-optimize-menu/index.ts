import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticate, jsonResponse } from "../_shared/aiAuth.ts";
import { checkAiCredits, chargeAiCredits, AI_CREDIT_COSTS } from "../_shared/aiCredits.ts";
import { getProviderForFeature } from "../../../packages/ai/providers/registry.ts";
import { runMenuOptimizer } from "../../../packages/ai/pipelines/optimizerPipeline.ts";

interface RequestBody {
  restaurantId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticate(req);
    if ("response" in auth) return auth.response;
    const { supabaseUser, supabaseService } = auth;

    const body = (await req.json()) as Partial<RequestBody>;
    if (!body.restaurantId) return jsonResponse({ error: "restaurantId is required" }, 400);

    const { data: restaurant, error: restaurantError } = await supabaseUser
      .from("restaurants")
      .select("id")
      .eq("id", body.restaurantId)
      .maybeSingle();
    if (restaurantError) throw restaurantError;
    if (!restaurant) return jsonResponse({ error: "Restaurant not found" }, 404);

    const creditCheck = await checkAiCredits(supabaseUser, body.restaurantId, "optimizer_run");
    if (!creditCheck.allowed) {
      return jsonResponse(
        { error: "AI credit limit reached for this plan", used: creditCheck.used, limit: creditCheck.limit },
        402,
      );
    }

    // Job row created via the RLS-scoped client (owners are allowed to INSERT their own
    // ai_jobs rows) — only status/output transitions require the service-role client.
    const { data: job, error: jobError } = await supabaseUser
      .from("ai_jobs")
      .insert({
        restaurant_id: body.restaurantId,
        created_by: auth.userId,
        job_type: "menu_optimizer_run",
        status: "queued",
        input: {},
      })
      .select("id")
      .single();
    if (jobError) throw jobError;
    const jobId = job.id as string;

    await supabaseService
      .from("ai_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("id", jobId);

    try {
      const provider = getProviderForFeature("menu_optimizer");
      const result = await runMenuOptimizer(supabaseUser, body.restaurantId, provider);

      await supabaseService
        .from("ai_menu_scores")
        .insert({ restaurant_id: body.restaurantId, ai_job_id: jobId, score: result.score, breakdown: result.breakdown });

      await chargeAiCredits(supabaseService, body.restaurantId, "optimizer_run", { aiJobId: jobId });

      await supabaseService
        .from("ai_jobs")
        .update({
          status: "completed",
          output: result,
          progress: 100,
          ai_credits_charged: AI_CREDIT_COSTS.optimizer_run,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      return jsonResponse({ jobId, result });
    } catch (innerError) {
      const message = innerError instanceof Error ? innerError.message : String(innerError);
      await supabaseService
        .from("ai_jobs")
        .update({ status: "failed", error: message, completed_at: new Date().toISOString() })
        .eq("id", jobId);
      throw innerError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ai-optimize-menu] ERROR", message);
    return jsonResponse({ error: message }, 500);
  }
});
