import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, subDays, format } from 'date-fns';

interface ViewStats {
  totalViews: number;
  todayViews: number;
  weekViews: number;
  viewsByDay: { date: string; views: number }[];
  viewsByLanguage: { language: string; views: number }[];
  topItems: { item_id: string; name: string; views: number }[];
}

export function useAnalytics(restaurantId: string | undefined) {
  const [stats, setStats] = useState<ViewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);

        const today = startOfDay(new Date());
        const sevenDaysAgo = subDays(today, 7);
        const thirtyDaysAgo = subDays(today, 30);

        // Fetch all views for the restaurant in the last 30 days
        const { data: views, error: viewsError } = await supabase
          .from('menu_views')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .gte('viewed_at', thirtyDaysAgo.toISOString())
          .order('viewed_at', { ascending: false });

        if (viewsError) throw viewsError;

        const allViews = views || [];

        // Calculate total views
        const totalViews = allViews.length;

        // Calculate today's views
        const todayViews = allViews.filter(
          (v) => new Date(v.viewed_at) >= today
        ).length;

        // Calculate week's views
        const weekViews = allViews.filter(
          (v) => new Date(v.viewed_at) >= sevenDaysAgo
        ).length;

        // Calculate views by day (last 7 days)
        const viewsByDay: { date: string; views: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const day = subDays(today, i);
          const nextDay = subDays(today, i - 1);
          const dayViews = allViews.filter((v) => {
            const viewDate = new Date(v.viewed_at);
            return viewDate >= day && viewDate < nextDay;
          }).length;
          viewsByDay.push({
            date: format(day, 'EEE'),
            views: dayViews,
          });
        }

        // Calculate views by language
        const languageCounts: Record<string, number> = {};
        allViews.forEach((v) => {
          if (v.language) {
            languageCounts[v.language] = (languageCounts[v.language] || 0) + 1;
          }
        });
        const viewsByLanguage = Object.entries(languageCounts)
          .map(([language, views]) => ({ language, views }))
          .sort((a, b) => b.views - a.views);

        // Calculate top items
        const itemCounts: Record<string, number> = {};
        allViews.forEach((v) => {
          if (v.item_id) {
            itemCounts[v.item_id] = (itemCounts[v.item_id] || 0) + 1;
          }
        });

        // Fetch item names for top items
        const topItemIds = Object.entries(itemCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id]) => id);

        let topItems: { item_id: string; name: string; views: number }[] = [];
        if (topItemIds.length > 0) {
          const { data: items } = await supabase
            .from('items')
            .select('id, name')
            .in('id', topItemIds);

          topItems = topItemIds.map((id) => ({
            item_id: id,
            name: items?.find((item) => item.id === id)?.name || 'Unknown',
            views: itemCounts[id],
          }));
        }

        setStats({
          totalViews,
          todayViews,
          weekViews,
          viewsByDay,
          viewsByLanguage,
          topItems,
        });
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [restaurantId]);

  return { stats, loading, error };
}
