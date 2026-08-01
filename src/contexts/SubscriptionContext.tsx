import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Subscription } from '@/types/database';
import { PlanType, PlanLimits, getPlanLimits, isPremiumPlan } from '@/lib/subscription-limits';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
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
  pro_annual: 'Ferreret Anual',
  lifetime: 'Myotragus',
};

export function SubscriptionProvider({ restaurantId, children }: SubscriptionProviderProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFetchedOnce = useRef(false);
  const previousPlan = useRef<PlanType | null>(null);
  const isVisibilityRefetch = useRef(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const refetch = useCallback(async (opts?: { silent?: boolean }) => {
    if (!restaurantId) {
      return;
    }
    if (!opts?.silent) setLoading(true);
    try {
      const data = await api.fetchSubscription(restaurantId);
      setSubscription(data);

      const newPlan = (data?.plan || 'free') as PlanType;
      
      // Show toast if plan changed after returning from checkout
      if (isVisibilityRefetch.current && previousPlan.current && previousPlan.current !== newPlan) {
        toast({
          title: t('dashboard.paymentSuccess'),
          description: t('dashboard.paymentSuccessDesc').replace('{plan}', PLAN_NAMES[newPlan]),
        });
      }
      
      previousPlan.current = newPlan;
      isVisibilityRefetch.current = false;
    } catch (error) {
      console.error('[SubscriptionContext] Error fetching subscription:', error);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [restaurantId, toast]);

  // Initial fetch
  useEffect(() => {
    refetch();
    hasFetchedOnce.current = true;
  }, [refetch]);

  // Auto-refresh when tab becomes visible (e.g., returning from Stripe checkout). Note:
  // visibilitychange and focus fire back-to-back on tab refocus, so guard against a double
  // fetch with a short debounce, and skip the loading flag here so the page (and any open
  // dialog, e.g. an AI import in progress) never re-renders as a loading skeleton on tab
  // switch. https://github.com/supabase/supabase-js also auto-refreshes tokens on
  // visibilitychange, which is harmless on its own.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const handleRefocus = () => {
      if (!hasFetchedOnce.current) return;
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        isVisibilityRefetch.current = true;
        void refetch({ silent: true });
      }, 150);
    };

    document.addEventListener('visibilitychange', handleRefocus);
    window.addEventListener('focus', handleRefocus);
    return () => {
      document.removeEventListener('visibilitychange', handleRefocus);
      window.removeEventListener('focus', handleRefocus);
      if (timeout) clearTimeout(timeout);
    };
  }, [refetch]);

  const plan: PlanType = (subscription?.plan || 'free') as PlanType;
  const defaultLimits = getPlanLimits(plan);
  
  // Use actual limits from subscription if available, fallback to plan defaults
  const limits: PlanLimits = {
    ...defaultLimits,
    // Override with actual values from subscription if they exist
    languages: subscription?.languages_limit ?? defaultLimits.languages,
    photos: subscription?.photos_limit ?? defaultLimits.photos,
  };
  
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
