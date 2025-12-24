import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Subscription } from '@/types/database';
import { PlanType, PlanLimits, getPlanLimits, isPremiumPlan } from '@/lib/subscription-limits';
import { useToast } from '@/hooks/use-toast';
import * as api from '@/lib/api';

interface SubscriptionContextType {
  subscription: Subscription | null;
  loading: boolean;
  plan: PlanType;
  limits: PlanLimits;
  isPremium: boolean;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

interface SubscriptionProviderProps {
  restaurantId: string;
  children: ReactNode;
}

const PLAN_NAMES: Record<PlanType, string> = {
  free: 'Free',
  pro_monthly: 'Ferreret',
  pro_annual: 'Myotragus',
  lifetime: 'Myotragus',
};

export function SubscriptionProvider({ restaurantId, children }: SubscriptionProviderProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFetchedOnce = useRef(false);
  const previousPlan = useRef<PlanType | null>(null);
  const isVisibilityRefetch = useRef(false);
  const { toast } = useToast();

  const refetch = useCallback(async () => {
    console.log('[SubscriptionContext] refetch called, restaurantId:', restaurantId);
    if (!restaurantId) {
      console.log('[SubscriptionContext] No restaurantId, skipping fetch');
      return;
    }
    setLoading(true);
    try {
      console.log('[SubscriptionContext] Fetching subscription...');
      const data = await api.fetchSubscription(restaurantId);
      console.log('[SubscriptionContext] Fetched subscription data:', data);
      setSubscription(data);

      const newPlan = (data?.plan || 'free') as PlanType;
      console.log('[SubscriptionContext] Plan resolved to:', newPlan);
      
      // Show toast if plan changed after returning from checkout
      if (isVisibilityRefetch.current && previousPlan.current && previousPlan.current !== newPlan) {
        toast({
          title: '¡Plan actualizado!',
          description: `Tu plan ha cambiado a ${PLAN_NAMES[newPlan]}.`,
        });
      }
      
      previousPlan.current = newPlan;
      isVisibilityRefetch.current = false;
    } catch (error) {
      console.error('[SubscriptionContext] Error fetching subscription:', error);
    } finally {
      setLoading(false);
      console.log('[SubscriptionContext] Loading complete');
    }
  }, [restaurantId, toast]);

  // Initial fetch
  useEffect(() => {
    refetch();
    hasFetchedOnce.current = true;
  }, [refetch]);

  // Auto-refresh when tab becomes visible (e.g., returning from Stripe checkout)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasFetchedOnce.current) {
        isVisibilityRefetch.current = true;
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

  // Also refresh when window gets focus (covers more edge cases)
  useEffect(() => {
    const handleFocus = () => {
      if (hasFetchedOnce.current) {
        isVisibilityRefetch.current = true;
        refetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetch]);

  const plan: PlanType = (subscription?.plan || 'free') as PlanType;
  const limits = getPlanLimits(plan);
  const isPremium = isPremiumPlan(plan);

  return (
    <SubscriptionContext.Provider 
      value={{ 
        subscription, 
        loading, 
        plan, 
        limits, 
        isPremium, 
        refetch 
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
}
