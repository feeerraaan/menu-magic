export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  instagram_url: string | null;
  website_url: string | null;
  currency: string;
  default_language: string;
  supported_languages: string[];
  hide_prices: boolean;
  theme: 'light' | 'dark';
  template: string;
  custom_domain: string | null;
  is_published: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Menu {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  schedule_rules: ScheduleRule[] | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  menu_id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations?: CategoryTranslation[];
}

export interface CategoryTranslation {
  id: string;
  category_id: string;
  language: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Item {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number | null;
  photo_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_spicy: boolean;
  is_gluten_free: boolean;
  allergens: string[];
  display_order: number;
  created_at: string;
  updated_at: string;
  translations?: ItemTranslation[];
}

export interface ItemTranslation {
  id: string;
  item_id: string;
  language: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  restaurant_id: string;
  plan: 'free' | 'pro_monthly' | 'pro_annual' | 'lifetime';
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  is_lifetime: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  photos_limit: number;
  languages_limit: number;
  created_at: string;
  updated_at: string;
}

export interface MenuView {
  id: string;
  restaurant_id: string;
  item_id: string | null;
  language: string | null;
  viewed_at: string;
}

export interface ScheduleRule {
  days: number[]; // 0-6, Sunday to Saturday
  start_time: string; // HH:mm
  end_time: string; // HH:mm
}

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type PlanType = 'free' | 'pro_monthly' | 'pro_annual' | 'lifetime';

export const PLAN_LIMITS: Record<PlanType, { photos: number; languages: number; menus: number; schedules: boolean; }> = {
  free: { photos: 0, languages: 1, menus: 1, schedules: false },
  pro_monthly: { photos: 50, languages: 2, menus: 2, schedules: true },
  pro_annual: { photos: 50, languages: 3, menus: 5, schedules: true },
  lifetime: { photos: 100, languages: 10, menus: 20, schedules: true },
};