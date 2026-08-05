import { useState, useEffect, useCallback } from 'react';
import * as aiApi from '@/lib/ai-api';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';

export interface AiCreditsState {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Live AI credit balance for the current plan: limit comes from the plan's
 * aiCreditsPerMonth (subscription-limits.ts), used comes from the ai_usage ledger via the
 * get_ai_credits_used_this_period RPC. Mounted anywhere inside SubscriptionProvider.
 */
export function useAiCredits(restaurantId: string | null | undefined): AiCreditsState {
  const { limits, plan } = useSubscriptionContext();
  const limit = limits.aiCreditsPerMonth;
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      setError(null);
      const value = await aiApi.fetchAiCreditsUsed(restaurantId);
      setUsed(value);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    refetch();
  }, [refetch, plan]);

  const remaining = Math.max(0, limit - used);
  const percentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return { used, limit, remaining, percentage, loading, error, refetch };
}
