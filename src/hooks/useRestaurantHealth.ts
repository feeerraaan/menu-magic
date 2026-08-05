import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  computeRestaurantHealth,
  type RestaurantHealth,
} from '@/lib/restaurant-health';
import type { Restaurant } from '@/types/database';

interface HealthSnapshot {
  date: string; // YYYY-MM-DD (local)
  score: number;
}

const SNAPSHOTS_KEY = (restaurantId: string) => `sacarta-health-${restaurantId}`;
const MAX_SNAPSHOTS = 30;

function readSnapshots(restaurantId: string): HealthSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY(restaurantId));
    const parsed = raw ? (JSON.parse(raw) as HealthSnapshot[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSnapshot(restaurantId: string, score: number): number | null {
  // Returns the most recent score from a *previous* day (for the trend delta).
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`;
  const snapshots = readSnapshots(restaurantId);
  const previous = [...snapshots].reverse().find((s) => s.date !== todayKey);
  const withoutToday = snapshots.filter((s) => s.date !== todayKey);
  const next = [...withoutToday, { date: todayKey, score }].slice(-MAX_SNAPSHOTS);
  try {
    localStorage.setItem(SNAPSHOTS_KEY(restaurantId), JSON.stringify(next));
  } catch {
    // storage full/blocked — non-fatal
  }
  return previous ? previous.score : null;
}

export interface UseRestaurantHealthResult {
  health: RestaurantHealth | null;
  /** Score delta vs the last snapshot from a previous day. null = no baseline yet. */
  delta: number | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Fetches the restaurant's menu data and computes the deterministic
 * Restaurant Health Score. Snapshots are kept in localStorage on purpose
 * (no DB writes → safe to merge, zero migration).
 */
export function useRestaurantHealth(
  restaurant: Restaurant | undefined,
  views30d: number | undefined,
): UseRestaurantHealthResult {
  const restaurantId = restaurant?.id;
  const [raw, setRaw] = useState<Awaited<ReturnType<typeof fetchMenuData>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMenuData(restaurantId)
      .then((data) => {
        if (!cancelled) setRaw(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e as Error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const health = useMemo(() => {
    if (!restaurant || !raw) return null;
    return computeRestaurantHealth({
      restaurant,
      categories: raw.categories,
      items: raw.items,
      itemTranslations: raw.itemTranslations,
      categoryTranslations: raw.categoryTranslations,
      views30d: views30d ?? 0,
    });
  }, [restaurant, raw, views30d]);

  // Persist the daily snapshot once the score is stable.
  useEffect(() => {
    if (!restaurantId || !health) return;
    const previousScore = persistSnapshot(restaurantId, health.score);
    setDelta(previousScore === null ? null : health.score - previousScore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, health?.score]);

  return { health, delta, loading, error };
}

async function fetchMenuData(restaurantId: string) {
  const { data: menus, error: menusError } = await supabase
    .from('menus')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true);
  if (menusError) throw menusError;

  const menuIds = (menus ?? []).map((m) => m.id);
  if (menuIds.length === 0) {
    return { categories: [], items: [], itemTranslations: [], categoryTranslations: [] };
  }

  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, is_active')
    .in('menu_id', menuIds)
    .eq('is_active', true);
  if (categoriesError) throw categoriesError;

  const categoryIds = (categories ?? []).map((c) => c.id);

  const { data: categoryTranslations, error: categoryTranslationsError } = await supabase
    .from('category_translations')
    .select('category_id, language, name')
    .in('category_id', categoryIds.length > 0 ? categoryIds : ['__none__']);
  if (categoryTranslationsError) throw categoryTranslationsError;

  if (categoryIds.length === 0) {
    return {
      categories: categories ?? [],
      items: [],
      itemTranslations: [],
      categoryTranslations: categoryTranslations ?? [],
    };
  }

  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select(
      'id, description, price, photo_url, is_vegetarian, is_vegan, is_gluten_free, is_spicy, allergens',
    )
    .in('category_id', categoryIds)
    .eq('is_active', true);
  if (itemsError) throw itemsError;

  const itemIds = (items ?? []).map((i) => i.id);

  const { data: itemTranslations, error: itemTranslationsError } = await supabase
    .from('item_translations')
    .select('item_id, language, name')
    .in('item_id', itemIds.length > 0 ? itemIds : ['__none__']);
  if (itemTranslationsError) throw itemTranslationsError;

  return {
    categories: categories ?? [],
    items: items ?? [],
    itemTranslations: itemTranslations ?? [],
    categoryTranslations: categoryTranslations ?? [],
  };
}
