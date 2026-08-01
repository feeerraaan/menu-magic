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
  analytics: boolean;
  qrCustomization: boolean;
  manualSetup: boolean;
  // Unified AI credit pool per billing period, spent across every AI feature
  // (description generation, translation, optimizer runs, imports). A single
  // pool instead of per-feature quotas because operation cost varies too much
  // (an import costs ~15x a single description) to hand-tune separately.
  aiCreditsPerMonth: number;
  // Phase 8: public anonymous chat on the menu page. Gated by plan flag, NOT credit-metered
  // against the owner's pool — its cost is driven by diner traffic, not the owner's actions
  // (see docs/FEATURE_SPECIFICATIONS.md §Phase 8).
  aiCustomerAssistantEnabled: boolean;
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
    items: 25,
    schedules: false,
    analytics: false,
    qrCustomization: false,
    manualSetup: false,
    aiCreditsPerMonth: 20,
    aiCustomerAssistantEnabled: false,
  },
  pro_monthly: {
    photos: 50,
    languages: 2,
    menus: 3,
    categories: 7,
    items: 50,
    schedules: true,
    analytics: true,
    qrCustomization: true,
    manualSetup: false,
    aiCreditsPerMonth: 300,
    aiCustomerAssistantEnabled: true,
  },
  pro_annual: {
    photos: 100,
    languages: 3,
    menus: 5,
    categories: 10,
    items: 100,
    schedules: true,
    analytics: true,
    qrCustomization: true,
    manualSetup: false,
    aiCreditsPerMonth: 500,
    aiCustomerAssistantEnabled: true,
  },
  lifetime: {
    photos: 1000,
    languages: 999,
    menus: 10,
    categories: 100,
    items: 1000,
    schedules: true,
    analytics: true,
    qrCustomization: true,
    manualSetup: true,
    aiCreditsPerMonth: 1000,
    aiCustomerAssistantEnabled: true,
  },
};

// ============================================
// AI CREDIT COSTS - per-operation cost against the unified aiCreditsPerMonth pool
// ============================================
export type AiUsageKind = 'description' | 'translation' | 'optimizer_run' | 'import' | 'copilot' | 'insights';

export const AI_CREDIT_COSTS: Record<AiUsageKind, number> = {
  description: 1,
  translation: 1,
  optimizer_run: 3,
  import: 15,
  copilot: 2,
  insights: 3,
};

// ============================================
// PLAN INFO - Names and descriptions
// ============================================
export const PLANS: Record<PlanType, PlanInfo> = {
  free: {
    id: 'free',
    name: 'Sargantana',
    description: 'Para empezar',
    limits: PLAN_LIMITS.free,
  },
  pro_monthly: {
    id: 'pro_monthly',
    name: 'Ferreret',
    description: 'Para restaurantes activos',
    limits: PLAN_LIMITS.pro_monthly,
    priceId: 'price_1SikkXCZS330jw8u1e7cOKrQ',
  },
  pro_annual: {
    id: 'pro_annual',
    name: 'Ferreret Anual',
    description: 'Acceso ilimitado',
    limits: PLAN_LIMITS.pro_annual,
    priceId: 'price_1SikkrCZS330jw8uTxFrG8c3',
  },
  lifetime: {
    id: 'lifetime',
    name: 'Myotragus',
    description: 'Acceso de por vida. Te preparamos el menú nosotros manualmente.',
    limits: PLAN_LIMITS.lifetime,
    priceId: 'price_1Sikn6CZS330jw8uv7g6gUs9',
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
  analytics: 'Analytics',
  qrCustomization: 'QR personalizado',
  manualSetup: 'Configuración manual del menú por nosotros',
  aiCreditsPerMonth: 'Créditos IA / mes',
  aiCustomerAssistantEnabled: 'Asistente IA para clientes',
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
