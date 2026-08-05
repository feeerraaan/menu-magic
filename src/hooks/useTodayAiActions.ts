import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay } from 'date-fns';

/**
 * Counts AI actions performed today (rows in ai_usage for this restaurant
 * since local start of day). Used by the "Today" card of the Overview.
 * Plan: docs/HACKATHON_POLISH_PLAN.md — Task 4.
 */
export function useTodayAiActions(restaurantId: string | undefined) {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .gte('created_at', startOfDay(new Date()).toISOString())
      .then(({ count: c, error }) => {
        if (cancelled) return;
        if (!error) setCount(c ?? 0);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  return { count, loading };
}
