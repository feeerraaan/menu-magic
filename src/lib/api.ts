import { supabase } from '@/integrations/supabase/client';
import { Restaurant, Menu, Category, Item, Subscription } from '@/types/database';

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
    .insert({ ...data, slug: slugData })
    .select()
    .single();
  
  if (error) throw error;

  // Create default subscription
  await supabase.from('subscriptions').insert({
    restaurant_id: restaurant.id,
    plan: 'free',
    status: 'active',
    photos_limit: 0,
    languages_limit: 1,
  });

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
    .update({ ...rest, schedule_rules: schedule_rules as unknown as any })
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
  return data as Subscription | null;
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