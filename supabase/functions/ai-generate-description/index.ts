import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticate, jsonResponse } from "../_shared/aiAuth.ts";
import { checkAiCredits, chargeAiCredits } from "../_shared/aiCredits.ts";
import { getProviderForFeature } from "../../../packages/ai/providers/registry.ts";
import { generateDescription } from "../../../packages/ai/agents/descriptionAgent.ts";
import type { DescriptionStyle } from "../../../packages/ai/schemas/description.ts";

const VALID_STYLES: DescriptionStyle[] = ["luxury", "traditional", "modern", "casual", "fine_dining"];

interface RequestBody {
  itemId: string;
  style: DescriptionStyle;
  locale: string;
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
    if (!body.itemId || !body.style || !body.locale) {
      return jsonResponse({ error: "itemId, style and locale are required" }, 400);
    }
    if (!VALID_STYLES.includes(body.style)) {
      return jsonResponse({ error: `style must be one of: ${VALID_STYLES.join(", ")}` }, 400);
    }

    // RLS on `items` already restricts this to rows the caller owns (via the
    // items->categories->menus->restaurants owner_id join chain) — a null result here means
    // either the item doesn't exist or the caller doesn't own it; both are a 404 to the caller.
    const { data: item, error: itemError } = await supabaseUser
      .from("items")
      .select("id, name, description, price, category_id, is_vegetarian, is_vegan, is_spicy, is_gluten_free, allergens")
      .eq("id", body.itemId)
      .maybeSingle();

    if (itemError) throw itemError;
    if (!item) return jsonResponse({ error: "Item not found" }, 404);

    const { data: category, error: categoryError } = await supabaseUser
      .from("categories")
      .select("name, menu_id, menus(restaurant_id, restaurants(currency))")
      .eq("id", item.category_id)
      .maybeSingle();
    if (categoryError) throw categoryError;

    // deno-lint-ignore no-explicit-any
    const menu = category?.menus as any;
    const restaurantId: string | undefined = menu?.restaurant_id;
    const currency: string | undefined = menu?.restaurants?.currency;
    if (!restaurantId) return jsonResponse({ error: "Could not resolve restaurant for this item" }, 404);

    const creditCheck = await checkAiCredits(supabaseUser, restaurantId, "description");
    if (!creditCheck.allowed) {
      return jsonResponse(
        {
          error: "AI credit limit reached for this plan",
          used: creditCheck.used,
          limit: creditCheck.limit,
        },
        402,
      );
    }

    const provider = getProviderForFeature("description_generator");
    const result = await generateDescription(
      provider,
      {
        name: item.name,
        existingDescription: item.description,
        categoryName: category?.name ?? null,
        dietary: {
          vegetarian: item.is_vegetarian,
          vegan: item.is_vegan,
          spicy: item.is_spicy,
          glutenFree: item.is_gluten_free,
        },
        allergens: item.allergens ?? [],
        price: item.price,
        currency,
      },
      body.style,
      body.locale,
    );

    await chargeAiCredits(supabaseService, restaurantId, "description", {
      metadata: { item_id: item.id, style: body.style, locale: body.locale },
    });

    return jsonResponse({ description: result.description });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ai-generate-description] ERROR", message);
    return jsonResponse({ error: message }, 500);
  }
});
