import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Subscription } from '@/types/database';
import { PlanType, PlanLimits, getPlanLimits, isPremiumPlan } from '@/lib/subscription-limits';
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

export function SubscriptionProvider({ restaurantId, children }: SubscriptionProviderProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFetchedOnce = useRef(false);

  const refetch = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const data = await api.fetchSubscription(restaurantId);
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  // Initial fetch
  useEffect(() => {
    refetch();
    hasFetchedOnce.current = true;
  }, [refetch]);

  // Auto-refresh when tab becomes visible (e.g., returning from Stripe checkout)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasFetchedOnce.current) {
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
