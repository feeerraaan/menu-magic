// Deterministic multi-step workflow (Phase 7): fetch real data -> compute metrics in plain
// code -> hand the metrics to insightsAgent for narrative + recommendations. The LLM never
// sees raw rows or recomputes counts itself — it only explains numbers this file computed,
// and only produces recommendation *proposals*; the Edge Function persists them.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import type { LLMProvider } from "../providers/types.ts";
import { generateInsights, type InsightsOutput } from "../agents/insightsAgent.ts";

export interface RecommendationProposal {
  category: string;
  target_type: 'item' | 'category' | 'menu' | 'restaurant' | null;
  target_id: string | null;
  title: string;
  detail: string;
}

export interface InsightsResult {
  narrative: string;
  recommendations: RecommendationProposal[];
}

const DAYS_AGO = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

export async function runInsights(
  supabase: SupabaseClient,
  restaurantId: string,
  provider: LLMProvider,
): Promise<InsightsResult> {
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("name, currency")
    .eq("id", restaurantId)
    .maybeSingle();
  if (restaurantError) throw restaurantError;
  if (!restaurant) throw new Error("Restaurant not found");

  const { data: menus } = await supabase.from("menus").select("id").eq("restaurant_id", restaurantId);
  const menuIds = (menus ?? []).map((m) => m.id);
  const { data: categories } = menuIds.length
    ? await supabase.from("categories").select("id, name").in("menu_id", menuIds)
    : { data: [] };
  const categoryIds = (categories ?? []).map((c) => c.id);
  const { data: items } = categoryIds.length
    ? await supabase
      .from("items")
      .select("id, name, price, photo_url, description, is_active, is_vegetarian, is_vegan, is_spicy, is_gluten_free, category_id")
      .in("category_id", categoryIds)
    : { data: [] };
  const itemRows = (items ?? []) as Array<{
    id: string; name: string; price: number | null; photo_url: string | null; description: string | null;
    is_active: boolean; is_vegetarian: boolean; is_vegan: boolean; is_spicy: boolean; is_gluten_free: boolean; category_id: string;
  }>;
  const activeItems = itemRows.filter((i) => i.is_active);

  // Views in the last 30 days (same window the Analytics page uses).
  const { data: views } = await supabase
    .from("menu_views")
    .select("item_id, language, viewed_at")
    .eq("restaurant_id", restaurantId)
    .gte("viewed_at", DAYS_AGO(30));
  const viewRows = (views ?? []) as Array<{ item_id: string | null; language: string | null; viewed_at: string }>;

  const totalViews = viewRows.length;
  const itemViews: Record<string, number> = {};
  for (const v of viewRows) {
    if (v.item_id) itemViews[v.item_id] = (itemViews[v.item_id] ?? 0) + 1;
  }
  const topItems = Object.entries(itemViews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ id, name: itemRows.find((i) => i.id === id)?.name ?? id, views: count }));

  const languageCounts: Record<string, number> = {};
  for (const v of viewRows) {
    if (v.language) languageCounts[v.language] = (languageCounts[v.language] ?? 0) + 1;
  }

  // Latest optimizer score + trend (if any runs happened).
  const { data: scores } = await supabase
    .from("ai_menu_scores")
    .select("score, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(10);

  const scoreRows = (scores ?? []) as Array<{ score: number; created_at: string }>;
  const latestScore = scoreRows[0]?.score ?? null;
  const scoreTrend = scoreRows.length > 1
    ? scoreRows.map((s) => s.score)
    : [];

  const categoryNames = new Map(categoryIds.map((c) => [c.id, c.name]));
  const itemsPerCategory = new Map<string, number>();
  for (const item of activeItems) {
    itemsPerCategory.set(item.category_id, (itemsPerCategory.get(item.category_id) ?? 0) + 1);
  }
  const topCategories = [...itemsPerCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([categoryId, count]) => ({ name: categoryNames.get(categoryId) ?? categoryId, count }));

  const withPhoto = activeItems.filter((i) => !!i.photo_url).length;
  const withDescription = activeItems.filter((i) => !!i.description?.trim()).length;
  const prices = activeItems.map((i) => i.price).filter((p): p is number => p != null);

  const metrics = {
    totals: {
      activeItems: activeItems.length,
      categories: categoryIds.length,
      menus: menuIds.length,
    },
    views: {
      totalLast30Days: totalViews,
      topItems,
      topCategories,
      byLanguage: languageCounts,
    },
    menuHealth: {
      photoCoverage: activeItems.length ? withPhoto / activeItems.length : 0,
      descriptionCoverage: activeItems.length ? withDescription / activeItems.length : 0,
      priceRange: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
      averagePrice: prices.length ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 : null,
    },
    dietary: {
      vegetarian: activeItems.filter((i) => i.is_vegetarian).length,
      vegan: activeItems.filter((i) => i.is_vegan).length,
      spicy: activeItems.filter((i) => i.is_spicy).length,
      glutenFree: activeItems.filter((i) => i.is_gluten_free).length,
    },
    optimizer: {
      latestScore,
      trend: scoreTrend,
    },
  };

  return generateInsights(provider, {
    restaurantName: restaurant.name,
    currency: restaurant.currency ?? 'EUR',
    metrics,
  }).then((output: InsightsOutput): InsightsResult => ({
    narrative: output.narrative,
    recommendations: output.recommendations.map((r) => ({
      category: r.category ?? 'general',
      target_type: r.target_type ?? null,
      target_id: r.target_id ?? null,
      title: r.title,
      detail: r.detail,
    })),
  }));
}
