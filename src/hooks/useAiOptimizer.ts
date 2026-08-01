import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as aiApi from '@/lib/ai-api';
import type { OptimizerOutput, MenuScoreHistoryEntry } from '@ai/optimizer';

export function useAiOptimizer(restaurantId: string | undefined) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [latestResult, setLatestResult] = useState<OptimizerOutput | null>(null);
  const [history, setHistory] = useState<MenuScoreHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const refetchHistory = useCallback(async () => {
    if (!restaurantId) return;
    setHistoryLoading(true);
    try {
      const data = await aiApi.fetchMenuScoreHistory(restaurantId);
      setHistory(data);
      if (data.length > 0 && !latestResult) {
        setLatestResult({ score: data[0].score, breakdown: data[0].breakdown, topRecommendations: [] });
      }
    } finally {
      setHistoryLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  useEffect(() => {
    refetchHistory();
  }, [refetchHistory]);

  // Realtime: this run() call resolves synchronously today, but subscribing here means the
  // UI keeps working unchanged if a future optimizer run ever needs to go fully async (the
  // same channel pattern Phase 4's AI Import relies on for real — see docs/AI_ARCHITECTURE.md §4).
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`ai_jobs:optimizer:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ai_jobs', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          const row = payload.new as { job_type?: string; status?: string; output?: OptimizerOutput | null };
          if (row.job_type === 'menu_optimizer_run' && row.status === 'completed' && row.output) {
            setLatestResult(row.output);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const run = async () => {
    if (!restaurantId) throw new Error('No restaurant');
    setLoading(true);
    setError(null);
    try {
      const { result } = await aiApi.runMenuOptimizer(restaurantId);
      setLatestResult(result);
      await refetchHistory();
      return result;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { run, loading, error, latestResult, history, historyLoading };
}
