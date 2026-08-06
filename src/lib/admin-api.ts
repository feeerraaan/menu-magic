import { supabase } from '@/integrations/supabase/client';

// Client API for the superadmin backoffice. Every call is gated server-side by the
// has_role(auth.uid(), 'admin') check inside the RPCs / Edge Function - the client just
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

// --- Restaurant deep control (see migration 20260805140000_*) ---

export interface AdminRestaurantSnapshot {
  restaurant: Record<string, unknown> & {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    currency: string;
    default_language: string;
    supported_languages: string[];
    hide_prices: boolean;
    theme: string;
    is_published: boolean;
    logo_url: string | null;
  };
  subscription: Record<string, unknown> & {
    plan: string;
    status: string;
    photos_limit: number;
    languages_limit: number;
  } | null;
}

export async function adminGetRestaurant(restaurantId: string): Promise<AdminRestaurantSnapshot | null> {
  const { data, error } = await supabase.rpc('admin_get_restaurant', { _restaurant_id: restaurantId });
  if (error) throw error;
  return data as unknown as AdminRestaurantSnapshot | null;
}

export async function adminUpdateRestaurantConfig(
  restaurantId: string,
  input: {
    name: string;
    address: string | null;
    phone: string | null;
    currency: string;
    default_language: string;
    supported_languages: string[];
    hide_prices: boolean;
    theme: string;
    is_published: boolean;
    logo_url: string | null;
  },
): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_update_restaurant_config', {
    _restaurant_id: restaurantId,
    _name: input.name,
    _address: input.address,
    _phone: input.phone,
    _currency: input.currency,
    _default_language: input.default_language,
    _supported_languages: input.supported_languages,
    _hide_prices: input.hide_prices,
    _theme: input.theme,
    _is_published: input.is_published,
    _logo_url: input.logo_url,
  });
  if (error) throw error;
  return !!data;
}

export interface AdminMenuRow {
  menu_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  schedule_rules: unknown;
  display_order: number;
  category_count: number;
  item_count: number;
}

export async function adminListMenus(restaurantId: string): Promise<AdminMenuRow[]> {
  const { data, error } = await supabase.rpc('admin_list_menus', { _restaurant_id: restaurantId });
  if (error) throw error;
  return (data ?? []) as AdminMenuRow[];
}

export async function adminCreateMenu(
  restaurantId: string,
  name: string,
  isActive: boolean,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('admin_create_menu', {
    _restaurant_id: restaurantId,
    _name: name,
    _is_active: isActive,
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function adminUpdateMenu(
  menuId: string,
  name: string,
  description: string | null,
  isActive: boolean,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_update_menu', {
    _menu_id: menuId,
    _name: name,
    _description: description,
    _is_active: isActive,
  });
  if (error) throw error;
  return !!data;
}

export async function adminDeleteMenu(menuId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_delete_menu', { _menu_id: menuId });
  if (error) throw error;
  return !!data;
}

export interface AdminMenuDetails {
  menu: Record<string, unknown> & { id: string; name: string; description: string | null; is_active: boolean };
  categories: Array<{
    category: Record<string, unknown> & { id: string; name: string; description: string | null };
    items: Array<Record<string, unknown> & { id: string; name: string; price: number | null }>;
  }>;
}

export async function adminGetMenuDetails(menuId: string): Promise<AdminMenuDetails | null> {
  const { data, error } = await supabase.rpc('admin_get_menu_details', { _menu_id: menuId });
  if (error) throw error;
  return data as unknown as AdminMenuDetails | null;
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

// Contact form messages (landing page "Contacto"), see migration 20260806090000_*.

export interface AdminContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export async function adminListContactMessages(): Promise<AdminContactMessage[]> {
  const { data, error } = await supabase.rpc('admin_list_contact_messages');
  if (error) throw error;
  return (data ?? []) as AdminContactMessage[];
}

export async function adminToggleContactMessageRead(
  messageId: string,
  isRead: boolean,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_toggle_contact_message_read', {
    _message_id: messageId,
    _is_read: isRead,
  });
  if (error) throw error;
  return !!data;
}

export async function adminDeleteContactMessage(messageId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_delete_contact_message', {
    _message_id: messageId,
  });
  if (error) throw error;
  return !!data;
}
