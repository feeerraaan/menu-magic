// Deterministic multi-step workflow: fetch menu data -> compute metrics in plain code ->
// hand the (already-computed) metrics to optimizerAgent for scoring/narrative. The LLM never
// sees raw item lists or recomputes counts/coverage itself — it only scores and explains
// numbers this file already worked out, which keeps its output grounded and auditable.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import type { LLMProvider } from "../providers/types.ts";
import { scoreMenu, type OptimizerOutput } from "../agents/optimizerAgent.ts";

interface ItemRow {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  photo_url: string | null;
  is_active: boolean;
  category_id: string;
  item_translations?: { language: string }[];
}

interface CategoryRow {
  id: string;
  name: string;
  is_active: boolean;
  menu_id: string;
}

interface MenuRow {
  id: string;
  is_active: boolean;
}

export async function runMenuOptimizer(
  supabase: SupabaseClient,
  restaurantId: string,
  provider: LLMProvider,
): Promise<OptimizerOutput> {
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("name, currency, supported_languages")
    .eq("id", restaurantId)
    .maybeSingle();
  if (restaurantError) throw restaurantError;
  if (!restaurant) throw new Error("Restaurant not found");

  const { data: menus, error: menusError } = await supabase
    .from("menus")
    .select("id, is_active")
    .eq("restaurant_id", restaurantId);
  if (menusError) throw menusError;
  const menuRows = (menus ?? []) as MenuRow[];
  const menuIds = menuRows.map((m) => m.id);

  const { data: categories, error: categoriesError } = menuIds.length
    ? await supabase.from("categories").select("id, name, is_active, menu_id").in("menu_id", menuIds)
    : { data: [] as CategoryRow[], error: null };
  if (categoriesError) throw categoriesError;
  const categoryRows = (categories ?? []) as CategoryRow[];
  const categoryIds = categoryRows.map((c) => c.id);

  const { data: items, error: itemsError } = categoryIds.length
    ? await supabase
      .from("items")
      .select("id, name, description, price, photo_url, is_active, category_id, item_translations(language)")
      .in("category_id", categoryIds)
    : { data: [] as ItemRow[], error: null };
  if (itemsError) throw itemsError;
  const itemRows = (items ?? []) as ItemRow[];

  const activeItems = itemRows.filter((i) => i.is_active);
  const activeCategories = categoryRows.filter((c) => c.is_active);

  const supportedLanguagesCount = Math.max(1, (restaurant.supported_languages ?? ["en"]).length);
  const extraLanguagesCount = Math.max(0, supportedLanguagesCount - 1);

  const withPhoto = activeItems.filter((i) => !!i.photo_url).length;
  const withDescription = activeItems.filter((i) => !!i.description?.trim()).length;
  const descLengths = activeItems.filter((i) => !!i.description).map((i) => i.description!.length);
  const avgDescLength = descLengths.length
    ? Math.round(descLengths.reduce((a, b) => a + b, 0) / descLengths.length)
    : 0;

  const prices = activeItems.map((i) => i.price).filter((p): p is number => p != null);
  const priceMin = prices.length ? Math.min(...prices) : null;
  const priceMax = prices.length ? Math.max(...prices) : null;

  const nameCounts = new Map<string, number>();
  for (const item of activeItems) {
    const key = item.name.trim().toLowerCase();
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }
  const duplicateItemNames = [...nameCounts.entries()].filter(([, count]) => count > 1).map(([name]) => name);

  const translationCoverage = extraLanguagesCount > 0
    ? activeItems.map((i) => (i.item_translations?.length ?? 0) / extraLanguagesCount)
    : [];
  const averageTranslationCoverage = translationCoverage.length
    ? translationCoverage.reduce((a, b) => a + b, 0) / translationCoverage.length
    : null;

  const itemsPerCategory = activeCategories.map(
    (c) => activeItems.filter((i) => i.category_id === c.id).length,
  );

  const metrics = {
    totals: {
      menus: menuRows.length,
      activeMenus: menuRows.filter((m) => m.is_active).length,
      categories: activeCategories.length,
      items: activeItems.length,
    },
    photoCoverage: activeItems.length ? withPhoto / activeItems.length : 0,
    descriptionCoverage: activeItems.length ? withDescription / activeItems.length : 0,
    averageDescriptionLength: avgDescLength,
    priceRange: { min: priceMin, max: priceMax },
    duplicateItemNames,
    supportedLanguagesCount,
    averageTranslationCoverage,
    itemsPerCategory,
  };

  return scoreMenu(provider, {
    restaurantName: restaurant.name,
    currency: restaurant.currency,
    metrics,
  });
}
