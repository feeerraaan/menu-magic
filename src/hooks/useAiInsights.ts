import { useState, useEffect, useCallback } from 'react';
import * as aiApi from '@/lib/ai-api';
import type { InsightsRecommendation } from '@ai/insights';

export function useAiInsights(restaurantId: string | undefined) {
  const [running, setRunning] = useState(false);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<InsightsRecommendation[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const refetchRecommendations = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const data = await aiApi.fetchRecommendations(restaurantId);
      setRecommendations(data.filter((r) => r.status === 'open'));
    } catch {
      // non-fatal
    }
  }, [restaurantId]);

  useEffect(() => {
    refetchRecommendations();
  }, [refetchRecommendations]);

  const run = async () => {
    if (!restaurantId) throw new Error('No restaurant');
    setRunning(true);
    setError(null);
    try {
      const res = await aiApi.runInsights({ restaurantId });
      setNarrative(res.narrative);
      setLastRunAt(res.generatedAt);
      await refetchRecommendations();
      return res;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setRunning(false);
    }
  };

  const dismiss = async (id: string) => {
    await aiApi.setRecommendationStatus(id, 'dismissed');
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
  };

  const action = async (id: string) => {
    await aiApi.setRecommendationStatus(id, 'actioned');
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
  };

  return { run, running, narrative, lastRunAt, recommendations, error, dismiss, action };
}
