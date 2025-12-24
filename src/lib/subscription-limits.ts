// ============================================
// SUBSCRIPTION PLAN LIMITS CONFIGURATION
// ============================================
// This file contains all plan-related constants.
// Easy to modify limits, labels, and features.
// ============================================

export type PlanType = 'free' | 'pro_monthly' | 'pro_annual' | 'lifetime';

export interface PlanLimits {
  photos: number;
  languages: number;
  menus: number;
  categories: number;
  items: number;
  schedules: boolean;
  templates: string[];
  analytics: boolean;
  customDomain: boolean;
  qrCustomization: boolean;
}

export interface PlanInfo {
  id: PlanType;
  name: string;
  description: string;
  limits: PlanLimits;
  priceId?: string;
}

// ============================================
// PLAN LIMITS - Modify values here easily
// ============================================
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    photos: 0,
    languages: 1,
    menus: 1,
    categories: 5,
    items: 20,
    schedules: false,
    templates: ['classic'],
    analytics: false,
    customDomain: false,
    qrCustomization: false,
  },
  pro_monthly: {
    photos: 50,
    languages: 3,
    menus: 10,
    categories: 50,
    items: 500,
    schedules: true,
    templates: ['classic', 'modern', 'minimal'],
    analytics: true,
    customDomain: true,
    qrCustomization: true,
  },
  pro_annual: {
    photos: 50,
    languages: 999,
    menus: 10,
    categories: 50,
    items: 500,
    schedules: true,
    templates: ['classic', 'modern', 'minimal'],
    analytics: true,
    customDomain: true,
    qrCustomization: true,
  },
  lifetime: {
    photos: 100,
    languages: 999,
    menus: 20,
    categories: 100,
    items: 1000,
    schedules: true,
    templates: ['classic', 'modern', 'minimal'],
    analytics: true,
    customDomain: true,
    qrCustomization: true,
  },
};

// ============================================
// PLAN INFO - Names and descriptions
// ============================================
export const PLANS: Record<PlanType, PlanInfo> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Para empezar',
    limits: PLAN_LIMITS.free,
  },
  pro_monthly: {
    id: 'pro_monthly',
    name: 'Ferreret',
    description: 'Para restaurantes activos',
    limits: PLAN_LIMITS.pro_monthly,
    priceId: 'price_1ShbjSClyJbFQEQavF7mAwX9',
  },
  pro_annual: {
    id: 'pro_annual',
    name: 'Myotragus',
    description: 'Acceso ilimitado',
    limits: PLAN_LIMITS.pro_annual,
    priceId: 'price_1ShbkAClyJbFQEQa0JUtzEOp',
  },
  lifetime: {
    id: 'lifetime',
    name: 'Myotragus',
    description: 'Acceso de por vida',
    limits: PLAN_LIMITS.lifetime,
    priceId: 'price_1ShbkTClyJbFQEQaodGb9UEE',
  },
};

// ============================================
// LIMIT LABELS - For UI display
// ============================================
export const LIMIT_LABELS: Record<keyof PlanLimits, string> = {
  photos: 'Fotos',
  languages: 'Idiomas',
  menus: 'Menús',
  categories: 'Categorías',
  items: 'Items',
  schedules: 'Horarios',
  templates: 'Plantillas',
  analytics: 'Analytics',
  customDomain: 'Dominio personalizado',
  qrCustomization: 'QR personalizado',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getPlanLimits(plan: PlanType): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

export function getPlanInfo(plan: PlanType): PlanInfo {
  return PLANS[plan] || PLANS.free;
}

export function isPremiumPlan(plan: PlanType): boolean {
  return plan !== 'free';
}

export function canUseFeature(plan: PlanType, feature: keyof PlanLimits): boolean {
  const limits = getPlanLimits(plan);
  const value = limits[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (Array.isArray(value)) return value.length > 1;
  return false;
}

export function isAtLimit(plan: PlanType, feature: keyof PlanLimits, current: number): boolean {
  const limits = getPlanLimits(plan);
  const limit = limits[feature];
  if (typeof limit !== 'number') return false;
  return current >= limit;
}

export function getRemainingCount(plan: PlanType, feature: keyof PlanLimits, current: number): number {
  const limits = getPlanLimits(plan);
  const limit = limits[feature];
  if (typeof limit !== 'number') return 0;
  return Math.max(0, limit - current);
}

export function getLimitPercentage(plan: PlanType, feature: keyof PlanLimits, current: number): number {
  const limits = getPlanLimits(plan);
  const limit = limits[feature];
  if (typeof limit !== 'number' || limit === 0) return 100;
  return Math.min(100, (current / limit) * 100);
}
