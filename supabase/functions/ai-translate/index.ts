import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticate, jsonResponse } from "../_shared/aiAuth.ts";
import { checkAiCredits, chargeAiCredits } from "../_shared/aiCredits.ts";
import { getProviderForFeature } from "../../../packages/ai/providers/registry.ts";
import { translateText } from "../../../packages/ai/agents/translationAgent.ts";

interface RequestBody {
  text: string;
  sourceLocale: string;
  targetLocale: string;
  restaurantId: string;
  context?: string;
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
    if (!body.text?.trim() || !body.sourceLocale || !body.targetLocale || !body.restaurantId) {
      return jsonResponse({ error: "text, sourceLocale, targetLocale and restaurantId are required" }, 400);
    }

    // RLS on `restaurants` restricts this to rows the caller owns — a null result means the
    // caller doesn't own this restaurant (or it doesn't exist); either way, a 404.
    const { data: restaurant, error: restaurantError } = await supabaseUser
      .from("restaurants")
      .select("id")
      .eq("id", body.restaurantId)
      .maybeSingle();
    if (restaurantError) throw restaurantError;
    if (!restaurant) return jsonResponse({ error: "Restaurant not found" }, 404);

    const creditCheck = await checkAiCredits(supabaseUser, body.restaurantId, "translation");
    if (!creditCheck.allowed) {
      return jsonResponse(
        { error: "AI credit limit reached for this plan", used: creditCheck.used, limit: creditCheck.limit },
        402,
      );
    }

    const provider = getProviderForFeature("translation");
    const result = await translateText(provider, body.text, body.sourceLocale, body.targetLocale, body.context);

    await chargeAiCredits(supabaseService, body.restaurantId, "translation", {
      metadata: { sourceLocale: body.sourceLocale, targetLocale: body.targetLocale, context: body.context },
    });

    return jsonResponse({ translatedText: result.translatedText });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ai-translate] ERROR", message);
    return jsonResponse({ error: message }, 500);
  }
});
