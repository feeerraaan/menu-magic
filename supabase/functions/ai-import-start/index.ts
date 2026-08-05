import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticate, jsonResponse } from "../_shared/aiAuth.ts";
import { checkAiCredits, chargeAiCredits, AI_CREDIT_COSTS } from "../_shared/aiCredits.ts";
import { getProviderForFeature } from "../../../packages/ai/providers/registry.ts";
import { runMenuImport, type ImportSource } from "../../../packages/ai/pipelines/importPipeline.ts";
import type { MenuImportSourceType } from "../../../packages/ai/schemas/menuImport.ts";

interface RequestBody {
  restaurantId: string;
  sourceType: MenuImportSourceType;
  text?: string;
  fileBase64?: string;
  fileName?: string;
  // Phase 5: allows the onboarding flow to tag its import runs distinctly ('ai_setup') for
  // analytics while reusing this exact function + importPipeline.ts. Defaults to 'menu_import'.
  jobType?: "menu_import" | "ai_setup";
}

const VALID_SOURCE_TYPES: MenuImportSourceType[] = ["text", "pdf"];
const VALID_JOB_TYPES = ["menu_import", "ai_setup"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticate(req);
    if ("response" in auth) return auth.response;
    const { supabaseUser, supabaseService, userId } = auth;

    const body = (await req.json()) as Partial<RequestBody>;
    if (!body.restaurantId || !body.sourceType) {
      return jsonResponse({ error: "restaurantId and sourceType are required" }, 400);
    }
    if (!VALID_SOURCE_TYPES.includes(body.sourceType)) {
      return jsonResponse(
        {
          error:
            `sourceType "${body.sourceType}" is not supported yet. Only text and pdf are ` +
            "implemented in this phase (Word/Excel/photo/URL import are not yet built).",
        },
        400,
      );
    }

    const jobType = body.jobType ?? "menu_import";
    if (!VALID_JOB_TYPES.includes(jobType)) {
      return jsonResponse({ error: `jobType "${jobType}" is not supported` }, 400);
    }

    const { data: restaurant, error: restaurantError } = await supabaseUser
      .from("restaurants")
      .select("id")
      .eq("id", body.restaurantId)
      .maybeSingle();
    if (restaurantError) throw restaurantError;
    if (!restaurant) return jsonResponse({ error: "Restaurant not found" }, 404);

    const creditCheck = await checkAiCredits(supabaseUser, body.restaurantId, "import");
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
        job_type: jobType,
        status: "queued",
        input: { sourceType: body.sourceType, fileName: body.fileName ?? null },
      })
      .select("id")
      .single();
    if (jobError) throw jobError;
    const jobId = job.id as string;

    await supabaseService
      .from("ai_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("id", jobId);

    const source: ImportSource = {
      sourceType: body.sourceType,
      text: body.text,
      fileBase64: body.fileBase64,
    };

    // Run the job before returning. EdgeRuntime.waitUntil used to let the request return quickly,
    // but Supabase can shut down the isolate while a multi-chunk import is still running. That
    // left ai_jobs stuck in `processing` after the provider work had already started. The UI still
    // receives the job id immediately for the normal short path, while long imports now either
    // write `completed`/`failed` or return a bounded provider error. The frontend keeps its
    // existing analysing state while this request is in flight and then fetches the job row.
    const backgroundWork = (async () => {
      try {
        const provider = getProviderForFeature("menu_import");
        const result = await runMenuImport(supabaseUser, body.restaurantId!, provider, source);

        await chargeAiCredits(supabaseService, body.restaurantId!, "import", {
          aiJobId: jobId,
          metadata: { sourceType: body.sourceType },
        });

        await supabaseService
          .from("ai_jobs")
          .update({
            status: "completed",
            output: result,
            progress: 100,
            ai_credits_charged: AI_CREDIT_COSTS.import,
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      } catch (innerError) {
        const message = innerError instanceof Error ? innerError.message : String(innerError);
        console.error("[ai-import-start] background job failed", message);
        await supabaseService
          .from("ai_jobs")
          .update({ status: "failed", error: message, completed_at: new Date().toISOString() })
          .eq("id", jobId);
      }
    })();

    await backgroundWork;

    return jsonResponse({ jobId, status: "processing" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ai-import-start] ERROR", message);
    return jsonResponse({ error: message }, 500);
  }
});
