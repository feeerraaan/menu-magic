import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Restaurant, Menu, Category, Item, Subscription } from '@/types/database';
import { PlanType, getPlanLimits } from '@/lib/subscription-limits';

// Restaurant hooks
export async function fetchRestaurant(userId: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle();
  
  if (error) throw error;
  return data as Restaurant | null;
}

export async function createRestaurant(data: Partial<Restaurant> & { owner_id: string; name: string }): Promise<Restaurant> {
  // Generate slug from name
  const { data: slugData } = await supabase.rpc('generate_unique_slug', { base_name: data.name });
  
  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .insert({ ...data, slug: slugData, is_published: true })
    .select()
    .single();
  
  if (error) throw error;

  // The default 'free' subscription row is created server-side by the
  // handle_new_restaurant_subscription trigger (migration 20260805120000_*) - the client
  // cannot insert into subscriptions (RLS blocks it), which is why this used to silently
  // no-op and leave restaurants without a subscription row.

  // Create default menu
  await supabase.from('menus').insert({
    restaurant_id: restaurant.id,
    name: 'Main Menu',
    is_active: true,
    display_order: 0,
  });

  return restaurant as Restaurant;
}

export async function updateRestaurant(id: string, data: Partial<Restaurant>): Promise<Restaurant> {
  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return restaurant as Restaurant;
}

// Menu hooks
export async function fetchMenus(restaurantId: string): Promise<Menu[]> {
  const { data, error } = await supabase
    .from('menus')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('display_order');
  
  if (error) throw error;
  return (data || []) as unknown as Menu[];
}

export async function createMenu(data: { restaurant_id: string; name: string; display_order?: number }): Promise<Menu> {
  const { data: menu, error } = await supabase
    .from('menus')
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return menu as unknown as Menu;
}

export async function updateMenu(id: string, data: Partial<Menu>): Promise<Menu> {
  const { schedule_rules, ...rest } = data;
  const { data: menu, error } = await supabase
    .from('menus')
    .update({ ...rest, schedule_rules: schedule_rules as unknown as Json | null })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return menu as unknown as Menu;
}

export async function deleteMenu(id: string): Promise<void> {
  const { error } = await supabase.from('menus').delete().eq('id', id);
  if (error) throw error;
}

// Category hooks
export async function fetchCategories(menuId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*, category_translations(*)')
    .eq('menu_id', menuId)
    .order('display_order');
  
  if (error) throw error;
  return (data || []).map(cat => ({
    ...cat,
    translations: cat.category_translations,
  })) as Category[];
}

export async function createCategory(data: Partial<Category> & { menu_id: string; name: string }): Promise<Category> {
  const { data: category, error } = await supabase
    .from('categories')
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return category as Category;
}

export async function updateCategory(id: string, data: Partial<Category>): Promise<Category> {
  const { data: category, error } = await supabase
    .from('categories')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return category as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

export async function updateCategoryOrder(categories: { id: string; display_order: number }[]): Promise<void> {
  for (const cat of categories) {
    await supabase.from('categories').update({ display_order: cat.display_order }).eq('id', cat.id);
  }
}

// Item hooks
export async function fetchItems(categoryId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*, item_translations(*)')
    .eq('category_id', categoryId)
    .order('display_order');
  
  if (error) throw error;
  return (data || []).map(item => ({
    ...item,
    translations: item.item_translations,
  })) as Item[];
}

export async function fetchAllItemsForMenu(menuId: string): Promise<Item[]> {
  const { data: categories } = await supabase
    .from('categories')
    .select('id')
    .eq('menu_id', menuId);
  
  if (!categories?.length) return [];

  const categoryIds = categories.map(c => c.id);
  const { data, error } = await supabase
    .from('items')
    .select('*, item_translations(*)')
    .in('category_id', categoryIds)
    .order('display_order');
  
  if (error) throw error;
  return (data || []).map(item => ({
    ...item,
    translations: item.item_translations,
  })) as Item[];
}

export async function createItem(data: Partial<Item> & { category_id: string; name: string }): Promise<Item> {
  const { data: item, error } = await supabase
    .from('items')
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return item as Item;
}

export async function updateItem(id: string, data: Partial<Item>): Promise<Item> {
  const { data: item, error } = await supabase
    .from('items')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return item as Item;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw error;
}

export async function updateItemOrder(items: { id: string; display_order: number; category_id?: string }[]): Promise<void> {
  for (const item of items) {
    const update: Partial<Item> = { display_order: item.display_order };
    if (item.category_id) update.category_id = item.category_id;
    await supabase.from('items').update(update).eq('id', item.id);
  }
}

export async function duplicateItem(item: Item): Promise<Item> {
  const newItem = {
    category_id: item.category_id,
    name: `${item.name} (copy)`,
    description: item.description,
    price: item.price,
    photo_url: item.photo_url,
    is_active: item.is_active,
    is_featured: item.is_featured,
    is_vegetarian: item.is_vegetarian,
    is_vegan: item.is_vegan,
    is_spicy: item.is_spicy,
    is_gluten_free: item.is_gluten_free,
    allergens: item.allergens,
    display_order: item.display_order + 1,
  };
  return createItem(newItem);
}

// Subscription hooks
export async function fetchSubscription(restaurantId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (error) throw error;
  return (data as Subscription | null) ?? null;
}

// Image upload
export async function uploadImage(file: File, restaurantId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${restaurantId}/${Date.now()}.${fileExt}`;
  
  const { error } = await supabase.storage
    .from('menu-images')
    .upload(fileName, file);
  
  if (error) throw error;
  
  const { data } = supabase.storage.from('menu-images').getPublicUrl(fileName);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// Plan-limit enforcement (server-side truth, not local UI state)
//
// The manual editor blocks in the UI via `canCreateMenu/Category/Item`, but those are
// computed from the component's local state which can drift (and AI import bypassed them
// entirely). These helpers query the real row counts + the real subscription plan right
// before a write and throw a clear upgrade-prompt error when the plan would be exceeded -
// the single source of truth for every create path.
// ---------------------------------------------------------------------------

export interface RestaurantUsage {
  menus: number;
  categories: number;
  items: number;
  photos: number;
}

export async function getRestaurantUsage(restaurantId: string): Promise<RestaurantUsage> {
  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('restaurant_id', restaurantId);
  const menuIds = (menus ?? []).map((m) => m.id as string);

  const { data: categories } = menuIds.length
    ? await supabase.from('categories').select('id').in('menu_id', menuIds)
    : { data: [] };
  const categoryIds = (categories ?? []).map((c) => c.id as string);

  const { data: items } = categoryIds.length
    ? await supabase.from('items').select('id, photo_url').in('category_id', categoryIds)
    : { data: [] };

  return {
    menus: menuIds.length,
    categories: categoryIds.length,
    items: (items ?? []).length,
    photos: (items ?? []).filter((i) => (i as { photo_url?: string | null }).photo_url).length,
  };
}

export interface UsageDelta {
  menus?: number;
  categories?: number;
  items?: number;
  photos?: number;
}

/**
 * Verifies that applying `delta` to the restaurant's current usage stays within the plan's
 * limits. Throws a clear, upgrade-prompt-shaped error listing exactly which limits would be
 * exceeded. Call BEFORE any create that adds menus/categories/items/photos.
 */
export async function assertWithinLimits(
  restaurantId: string,
  delta: UsageDelta,
  opts?: { plan?: PlanType },
): Promise<void> {
  const plan = opts?.plan ?? (await getPlanType(restaurantId));
  const limits = getPlanLimits(plan);
  const usage = await getRestaurantUsage(restaurantId);

  const exceeded: string[] = [];
  if (delta.menus && usage.menus + delta.menus > limits.menus) {
    exceeded.push(`menús (${usage.menus} + ${delta.menus} > ${limits.menus})`);
  }
  if (delta.categories && usage.categories + delta.categories > limits.categories) {
    exceeded.push(`categorías (${usage.categories} + ${delta.categories} > ${limits.categories})`);
  }
  if (delta.items && usage.items + delta.items > limits.items) {
    exceeded.push(`platos (${usage.items} + ${delta.items} > ${limits.items})`);
  }
  if (delta.photos && usage.photos + delta.photos > limits.photos) {
    exceeded.push(`fotos (${usage.photos} + ${delta.photos} > ${limits.photos})`);
  }

  if (exceeded.length > 0) {
    const limitLabels = exceeded.join(', ');
    throw new Error(
      `Límite de ${limitLabels} de tu plan (${plan}). Mejora tu plan para seguir añadiendo.`,
    );
  }
}

async function getPlanType(restaurantId: string): Promise<PlanType> {
  const sub = await fetchSubscription(restaurantId);
  return (sub?.plan ?? 'free') as PlanType;
}