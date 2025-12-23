import { useMemo } from 'react';
import { 
  PlanType, 
  PlanLimits,
  getPlanLimits, 
  isAtLimit, 
  getRemainingCount,
  getLimitPercentage,
  isPremiumPlan,
  canUseFeature,
} from '@/lib/subscription-limits';

interface UsePlanLimitsResult {
  limits: PlanLimits;
  isPremium: boolean;
  checkLimit: (feature: keyof PlanLimits, current: number) => boolean;
  getRemaining: (feature: keyof PlanLimits, current: number) => number;
  getPercentage: (feature: keyof PlanLimits, current: number) => number;
  canUse: (feature: keyof PlanLimits) => boolean;
}

export function usePlanLimits(plan: PlanType = 'free'): UsePlanLimitsResult {
  return useMemo(() => {
    const limits = getPlanLimits(plan);
    
    return {
      limits,
      isPremium: isPremiumPlan(plan),
      checkLimit: (feature: keyof PlanLimits, current: number) => 
        isAtLimit(plan, feature, current),
      getRemaining: (feature: keyof PlanLimits, current: number) => 
        getRemainingCount(plan, feature, current),
      getPercentage: (feature: keyof PlanLimits, current: number) => 
        getLimitPercentage(plan, feature, current),
      canUse: (feature: keyof PlanLimits) => 
        canUseFeature(plan, feature),
    };
  }, [plan]);
}
