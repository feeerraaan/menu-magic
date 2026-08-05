import { supabase } from '@/integrations/supabase/client';

// Client API for the superadmin backoffice. Every call is gated server-side by the
// has_role(auth.uid(), 'admin') check inside the RPCs / Edge Function — the client just
// surfaces the results.

export interface AdminUserRow {
  user_id: string;
  email: string | null;
  user_created_at: string | null;
  restaurant_id: string | null;
  restaurant_name: string | null;
  slug: string | null;
  is_published: boolean | null;
  plan: string | null;
  subscription_status: string | null;
  photos_limit: number | null;
  languages_limit: number | null;
  manual_override: boolean | null;
  stripe_subscription_id: string | null;
}

export async function adminListUsers(): Promise<AdminUserRow[]> {
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw error;
  return (data ?? []) as AdminUserRow[];
}

export async function adminUpdateRestaurant(
  restaurantId: string,
  name: string,
  isPublished: boolean,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_update_restaurant', {
    _restaurant_id: restaurantId,
    _name: name,
    _is_published: isPublished,
  });
  if (error) throw error;
  return !!data;
}

export async function adminUpdateSubscription(
  restaurantId: string,
  plan: string,
  photosLimit: number,
  languagesLimit: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_update_subscription', {
    _restaurant_id: restaurantId,
    _plan: plan,
    _photos_limit: photosLimit,
    _languages_limit: languagesLimit,
  });
  if (error) throw error;
  return !!data;
}

export interface AdminCoupon {
  id: string;
  code: string;
  active: boolean;
  times_redeemed: number;
  max_redemptions: number | null;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
  expires_at: number | null;
}

async function invokeAdmin(body: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke('admin-coupons', { body });
  if (error) {
    const context = (error as { context?: Response }).context;
    let message = error.message;
    try {
      const parsed = await context?.json();
      if (typeof parsed?.error === 'string') message = parsed.error;
    } catch {
      // keep default
    }
    throw new Error(message);
  }
  return data;
}

export async function adminListCoupons(): Promise<AdminCoupon[]> {
  const data = (await invokeAdmin({ action: 'list_coupons' })) as { coupons: AdminCoupon[] };
  return data?.coupons ?? [];
}

export async function adminCreateCoupon(input: {
  code: string;
  percent_off: number;
  max_redemptions?: number;
  expires_days?: number;
}): Promise<{ id: string; code: string; percent_off: number }> {
  return (await invokeAdmin({ action: 'create_coupon', ...input })) as {
    id: string;
    code: string;
    percent_off: number;
  };
}

export async function adminDeactivateCoupon(id: string): Promise<{ id: string; active: boolean }> {
  return (await invokeAdmin({ action: 'deactivate_coupon', id })) as {
    id: string;
    active: boolean;
  };
}
