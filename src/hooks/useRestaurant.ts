import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Restaurant, Menu, Category, Item, Subscription } from '@/types/database';
import * as api from '@/lib/api';

export function useRestaurant() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.fetchRestaurant(user.id);
      setRestaurant(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [user]);

  const create = async (data: Partial<Restaurant> & { name: string }) => {
    if (!user) throw new Error('Not authenticated');
    const newRestaurant = await api.createRestaurant({ ...data, owner_id: user.id });
    setRestaurant(newRestaurant);
    return newRestaurant;
  };

  const update = async (data: Partial<Restaurant>) => {
    if (!restaurant) throw new Error('No restaurant');
    const updated = await api.updateRestaurant(restaurant.id, data);
    setRestaurant(updated);
    return updated;
  };

  return { restaurant, loading, error, refetch, create, update };
}

export function useMenus(restaurantId: string | undefined) {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const data = await api.fetchMenus(restaurantId);
      setMenus(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [restaurantId]);

  const create = async (name: string) => {
    if (!restaurantId) throw new Error('No restaurant');
    const menu = await api.createMenu({ restaurant_id: restaurantId, name, display_order: menus.length });
    setMenus([...menus, menu]);
    return menu;
  };

  const update = async (id: string, data: Partial<Menu>) => {
    const updated = await api.updateMenu(id, data);
    setMenus(menus.map(m => m.id === id ? updated : m));
    return updated;
  };

  const remove = async (id: string) => {
    await api.deleteMenu(id);
    setMenus(menus.filter(m => m.id !== id));
  };

  return { menus, loading, refetch, create, update, remove };
}

export function useCategories(menuId: string | undefined) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!menuId) return;
    setLoading(true);
    try {
      const data = await api.fetchCategories(menuId);
      setCategories(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [menuId]);

  const create = async (name: string) => {
    if (!menuId) throw new Error('No menu');
    const category = await api.createCategory({ menu_id: menuId, name, display_order: categories.length });
    setCategories([...categories, category]);
    return category;
  };

  const update = async (id: string, data: Partial<Category>) => {
    const updated = await api.updateCategory(id, data);
    setCategories(categories.map(c => c.id === id ? { ...c, ...updated } : c));
    return updated;
  };

  const remove = async (id: string) => {
    await api.deleteCategory(id);
    setCategories(categories.filter(c => c.id !== id));
  };

  const reorder = async (newOrder: Category[]) => {
    setCategories(newOrder);
    await api.updateCategoryOrder(newOrder.map((c, i) => ({ id: c.id, display_order: i })));
  };

  return { categories, loading, refetch, create, update, remove, reorder, setCategories };
}

export function useItems(categoryId: string | undefined) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!categoryId) return;
    setLoading(true);
    try {
      const data = await api.fetchItems(categoryId);
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [categoryId]);

  const create = async (name: string, data?: Partial<Item>) => {
    if (!categoryId) throw new Error('No category');
    const item = await api.createItem({ 
      category_id: categoryId, 
      name, 
      display_order: items.length,
      ...data 
    });
    setItems([...items, item]);
    return item;
  };

  const update = async (id: string, data: Partial<Item>) => {
    const updated = await api.updateItem(id, data);
    setItems(items.map(i => i.id === id ? { ...i, ...updated } : i));
    return updated;
  };

  const remove = async (id: string) => {
    await api.deleteItem(id);
    setItems(items.filter(i => i.id !== id));
  };

  const duplicate = async (item: Item) => {
    const newItem = await api.duplicateItem(item);
    setItems([...items, newItem]);
    return newItem;
  };

  const reorder = async (newOrder: Item[]) => {
    setItems(newOrder);
    await api.updateItemOrder(newOrder.map((i, idx) => ({ id: i.id, display_order: idx })));
  };

  return { items, loading, refetch, create, update, remove, duplicate, reorder, setItems };
}

export function useSubscription(restaurantId: string | undefined) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const data = await api.fetchSubscription(restaurantId);
      setSubscription(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [restaurantId]);

  return { subscription, loading, refetch };
}