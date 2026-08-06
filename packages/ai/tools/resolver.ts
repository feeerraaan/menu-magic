// Deterministic resolver for the AI Copilot. The LLM NEVER emits row IDs and never writes —
// it emits fuzzy, human-readable filters. This file turns those filters into concrete
// menus/categories/items scoped to the caller's restaurant, and computes before/after
// previews WITHOUT writing anything. Only confirmed previews are applied, by executor.ts.
// See docs/FEATURE_SPECIFICATIONS.md §Phase 6 (core safety rule).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export interface MenuRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface CategoryRow {
  id: string;
  menu_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface ItemRow {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number | null;
  photo_url: string | null;
  is_active: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_spicy: boolean;
  is_gluten_free: boolean;
  allergens: string[];
}

export interface MenuGraph {
  restaurantId: string;
  restaurantName: string;
  currency: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  menus: MenuRow[];
  categories: CategoryRow[];
  items: ItemRow[];
}

export async function loadMenuGraph(
  supabase: SupabaseClient,
  restaurantId: string,
): Promise<MenuGraph> {
  const { data: restaurant, error: restError } = await supabase
    .from("restaurants")
    .select("name, currency, default_language, supported_languages")
    .eq("id", restaurantId)
    .maybeSingle();
  if (restError) throw restError;
  if (!restaurant) throw new Error("Restaurant not found");

  const { data: menus } = await supabase
    .from("menus")
    .select("id, name, description, is_active")
    .eq("restaurant_id", restaurantId);
  const menuRows = (menus ?? []) as unknown as MenuRow[];
  const menuIds = menuRows.map((m) => m.id);

  const { data: categories } = menuIds.length
    ? await supabase.from("categories").select("id, menu_id, name, description, is_active").in("menu_id", menuIds)
    : { data: [] };
  const categoryRows = (categories ?? []) as unknown as CategoryRow[];
  const categoryIds = categoryRows.map((c) => c.id);

  const { data: items } = categoryIds.length
    ? await supabase
      .from("items")
      .select(
        "id, category_id, name, description, price, photo_url, is_active, is_vegetarian, is_vegan, is_spicy, is_gluten_free, allergens",
      )
      .in("category_id", categoryIds)
    : { data: [] };
  const itemRows = (items ?? []) as unknown as ItemRow[];

  return {
    restaurantId,
    restaurantName: restaurant.name,
    currency: restaurant.currency ?? "EUR",
    defaultLanguage: restaurant.default_language ?? "es",
    supportedLanguages: restaurant.supported_languages ?? [restaurant.default_language ?? "es"],
    menus: menuRows,
    categories: categoryRows,
    items: itemRows,
  };
}

const norm = (s: string): string => s.trim().toLowerCase();

export function matchesFragment(value: string | null | undefined, fragment?: string): boolean {
  if (!fragment || !fragment.trim()) return true;
  if (!value) return false;
  return norm(value).includes(norm(fragment));
}

export interface ItemFilter {
  name_contains?: string;
  category_name_contains?: string;
  price_min?: number;
  price_max?: number;
  is_vegetarian?: boolean;
  is_vegan?: boolean;
  is_spicy?: boolean;
  is_gluten_free?: boolean;
  is_active?: boolean;
  has_flag?: string;
}

export function matchItems(graph: MenuGraph, filter: ItemFilter): ItemRow[] {
  const categoryIds = filter.category_name_contains
    ? new Set(
      graph.categories.filter((c) => matchesFragment(c.name, filter.category_name_contains)).map((c) => c.id),
    )
    : null;

  return graph.items.filter((item) => {
    if (categoryIds && !categoryIds.has(item.category_id)) return false;
    if (!matchesFragment(item.name, filter.name_contains)) return false;
    if (filter.price_min !== undefined && (item.price ?? -1) < filter.price_min) return false;
    if (filter.price_max !== undefined && (item.price ?? Number.MAX_SAFE_INTEGER) > filter.price_max) return false;
    if (filter.is_vegetarian !== undefined && item.is_vegetarian !== filter.is_vegetarian) return false;
    if (filter.is_vegan !== undefined && item.is_vegan !== filter.is_vegan) return false;
    if (filter.is_spicy !== undefined && item.is_spicy !== filter.is_spicy) return false;
    if (filter.is_gluten_free !== undefined && item.is_gluten_free !== filter.is_gluten_free) return false;
    if (filter.is_active !== undefined && item.is_active !== filter.is_active) return false;
    if (filter.has_flag) {
      const flagMap: Record<string, boolean> = {
        is_vegan: item.is_vegan,
        is_vegetarian: item.is_vegetarian,
        is_spicy: item.is_spicy,
        is_gluten_free: item.is_gluten_free,
        is_active: item.is_active,
      };
      if (!flagMap[filter.has_flag]) return false;
    }
    return true;
  });
}

export function resolveCategory(graph: MenuGraph, nameOrId: string): CategoryRow[] {
  const byId = graph.categories.filter((c) => c.id === nameOrId);
  if (byId.length > 0) return byId;
  return graph.categories.filter((c) => norm(c.name) === norm(nameOrId));
}

export function resolveMenu(graph: MenuGraph, nameOrId: string): MenuRow[] {
  const byId = graph.menus.filter((m) => m.id === nameOrId);
  if (byId.length > 0) return byId;
  return graph.menus.filter((m) => norm(m.name) === norm(nameOrId));
}

export function resolveItem(graph: MenuGraph, nameOrId: string): ItemRow[] {
  const byId = graph.items.filter((i) => i.id === nameOrId);
  if (byId.length > 0) return byId;
  return graph.items.filter((i) => norm(i.name) === norm(nameOrId));
}

// Rounds to nearest N decimals (or to a whole number when round_to === 0). Returns null if
// the price isn't a finite number. Negative results are floored at 0 — a price can't go below 0.
export function applyPriceDelta(
  price: number | null,
  deltaPercent: number | undefined,
  deltaAbsolute: number | undefined,
  roundTo: number | undefined,
): number | null {
  if (price === null || price === undefined) return null;
  let next = price;
  if (deltaPercent !== undefined) next = next * (1 + deltaPercent / 100);
  if (deltaAbsolute !== undefined) next = next + deltaAbsolute;
  if (roundTo !== undefined) next = Math.round(next * 10 ** roundTo) / 10 ** roundTo;
  else next = Math.round(next * 100) / 100;
  return next < 0 ? 0 : next;
}

export interface MutationChange {
  entity_type: 'item' | 'category' | 'menu';
  entity_id: string;
  entity_name: string;
  field: string;
  before: unknown;
  after: unknown;
}

export interface ComputedPreview {
  summary: string;
  destructive: boolean;
  affected_count: number;
  changes: MutationChange[];
  // Resolved context that executor.ts needs to apply the mutation (never sent to the LLM).
  resolved: {
    itemIds?: string[];
    categoryId?: string;
    menuId?: string;
    language?: string;
  };
  // Optional payload generated during preview (e.g. proposed items or translations) that the
  // executor persists verbatim on confirmation — avoids regenerating on confirm.
  payload?: Record<string, unknown>;
}

function categoryName(graph: MenuGraph, categoryId: string): string {
  return graph.categories.find((c) => c.id === categoryId)?.name ?? categoryId;
}

export function previewBulkAdjustPrices(
  graph: MenuGraph,
  args: {
    category_name_filter?: string;
    item_name_filter?: string;
    price_delta_percent?: number;
    price_delta_absolute?: number;
    round_to?: number;
  },
): ComputedPreview {
  const items = matchItems(graph, {
    category_name_contains: args.category_name_filter,
    name_contains: args.item_name_filter,
  });
  const changes: MutationChange[] = items.map((item) => ({
    entity_type: 'item',
    entity_id: item.id,
    entity_name: item.name,
    field: 'price',
    before: item.price,
    after: applyPriceDelta(item.price, args.price_delta_percent, args.price_delta_absolute, args.round_to),
  }));
  const hasChange = changes.some((c) => c.before !== c.after);
  return {
    summary: hasChange
      ? `Adjust prices of ${items.length} dish(es)${args.category_name_filter ? ` in categories containing "${args.category_name_filter}"` : ''}${args.item_name_filter ? ` with names containing "${args.item_name_filter}"` : ''}.`
      : `No dishes match the filter. Nothing to adjust.`,
    destructive: false,
    affected_count: items.length,
    changes,
    resolved: { itemIds: items.map((i) => i.id) },
  };
}

export function previewBulkUpdateDietaryFlags(
  graph: MenuGraph,
  args: {
    filter: ItemFilter;
    set: {
      is_active?: boolean;
      is_vegan?: boolean;
      is_vegetarian?: boolean;
      is_gluten_free?: boolean;
      is_spicy?: boolean;
      allergens_add?: string[];
      allergens_remove?: string[];
    };
  },
): ComputedPreview {
  const items = matchItems(graph, args.filter);
  const changes: MutationChange[] = [];
  for (const item of items) {
    if (args.set.is_active !== undefined && item.is_active !== args.set.is_active) {
      changes.push({ entity_type: 'item', entity_id: item.id, entity_name: item.name, field: 'is_active', before: item.is_active, after: args.set.is_active });
    }
    if (args.set.is_vegan !== undefined && item.is_vegan !== args.set.is_vegan) {
      changes.push({ entity_type: 'item', entity_id: item.id, entity_name: item.name, field: 'is_vegan', before: item.is_vegan, after: args.set.is_vegan });
    }
    if (args.set.is_vegetarian !== undefined && item.is_vegetarian !== args.set.is_vegetarian) {
      changes.push({ entity_type: 'item', entity_id: item.id, entity_name: item.name, field: 'is_vegetarian', before: item.is_vegetarian, after: args.set.is_vegetarian });
    }
    if (args.set.is_gluten_free !== undefined && item.is_gluten_free !== args.set.is_gluten_free) {
      changes.push({ entity_type: 'item', entity_id: item.id, entity_name: item.name, field: 'is_gluten_free', before: item.is_gluten_free, after: args.set.is_gluten_free });
    }
    if (args.set.is_spicy !== undefined && item.is_spicy !== args.set.is_spicy) {
      changes.push({ entity_type: 'item', entity_id: item.id, entity_name: item.name, field: 'is_spicy', before: item.is_spicy, after: args.set.is_spicy });
    }
    if (args.set.allergens_add && args.set.allergens_add.length > 0) {
      const next = Array.from(new Set([...(item.allergens ?? []), ...args.set.allergens_add]));
      if (next.length !== (item.allergens ?? []).length) {
        changes.push({ entity_type: 'item', entity_id: item.id, entity_name: item.name, field: 'allergens', before: item.allergens, after: next });
      }
    }
    if (args.set.allergens_remove && args.set.allergens_remove.length > 0) {
      const next = (item.allergens ?? []).filter((a) => !args.set.allergens_remove!.includes(a));
      if (next.length !== (item.allergens ?? []).length) {
        changes.push({ entity_type: 'item', entity_id: item.id, entity_name: item.name, field: 'allergens', before: item.allergens, after: next });
      }
    }
  }
  const softHide = changes.some((c) => c.field === 'is_active' && c.after === false);
  return {
    summary: changes.length
      ? `Update ${items.length} dish(es) (${changes.length} change(s)).${softHide ? ' Includes hiding dishes (is_active=false). No physical deletion.' : ''}`
      : 'No dishes match or no real change. Nothing to do.',
    destructive: softHide,
    affected_count: items.length,
    changes,
    resolved: { itemIds: items.map((i) => i.id) },
  };
}

export function previewCreateCategory(
  graph: MenuGraph,
  args: { menu_id?: string; menu_name?: string; name: string; description?: string },
): ComputedPreview {
  const menus = args.menu_id ? graph.menus.filter((m) => m.id === args.menu_id) : args.menu_name ? resolveMenu(graph, args.menu_name) : [];
  if (menus.length === 0) {
    return {
      summary: 'Target menu not found. Name an existing menu (use get_menu_structure).',
      destructive: false,
      affected_count: 0,
      changes: [],
      resolved: {},
    };
  }
  const menu = menus[0];
  const existing = graph.categories.some((c) => c.menu_id === menu.id && norm(c.name) === norm(args.name));
  if (existing) {
    return {
      summary: `The category "${args.name}" already exists in menu "${menu.name}".`,
      destructive: false,
      affected_count: 0,
      changes: [],
      resolved: { menuId: menu.id },
    };
  }
  return {
    summary: `Create category "${args.name}" in menu "${menu.name}".`,
    destructive: false,
    affected_count: 1,
    changes: [{ entity_type: 'category', entity_id: '__new__', entity_name: args.name, field: 'name', before: null, after: args.name }],
    resolved: { menuId: menu.id },
    payload: { name: args.name, description: args.description ?? null },
  };
}

export function previewCreateItem(
  graph: MenuGraph,
  args: {
    category_id?: string;
    category_name?: string;
    name: string;
    description?: string;
    price?: number;
    is_vegetarian?: boolean;
    is_vegan?: boolean;
    is_spicy?: boolean;
    is_gluten_free?: boolean;
    allergens?: string[];
  },
): ComputedPreview {
  const cats = args.category_id
    ? graph.categories.filter((c) => c.id === args.category_id)
    : args.category_name
      ? resolveCategory(graph, args.category_name)
      : [];
  if (cats.length === 0) {
    return {
      summary: 'Target category not found. Give the exact name of an existing category.',
      destructive: false,
      affected_count: 0,
      changes: [],
      resolved: {},
    };
  }
  const cat = cats[0];
  const existing = graph.items.some((i) => i.category_id === cat.id && norm(i.name) === norm(args.name));
  if (existing) {
    return {
      summary: `The dish "${args.name}" already exists in "${cat.name}".`,
      destructive: false,
      affected_count: 0,
      changes: [],
      resolved: { categoryId: cat.id },
    };
  }
  return {
    summary: `Crear plato "${args.name}"${args.price !== undefined ? ` at ${args.price} ${graph.currency}` : ''} in "${cat.name}" (hidden until published).`,
    destructive: false,
    affected_count: 1,
    changes: [{ entity_type: 'item', entity_id: '__new__', entity_name: args.name, field: 'name', before: null, after: args.name }],
    resolved: { categoryId: cat.id },
    payload: {
      name: args.name,
      description: args.description ?? null,
      price: args.price ?? null,
      is_vegetarian: args.is_vegetarian ?? false,
      is_vegan: args.is_vegan ?? false,
      is_spicy: args.is_spicy ?? false,
      is_gluten_free: args.is_gluten_free ?? false,
      allergens: args.allergens ?? [],
    },
  };
}

export function previewUpdateItem(
  graph: MenuGraph,
  args: { item_id?: string; item_name?: string; set: Record<string, unknown> },
): ComputedPreview {
  const items = args.item_id ? graph.items.filter((i) => i.id === args.item_id) : args.item_name ? resolveItem(graph, args.item_name) : [];
  if (items.length === 0) {
    return {
      summary: 'Dish not found. Use search_items to locate it.',
      destructive: false,
      affected_count: 0,
      changes: [],
      resolved: {},
    };
  }
  const item = items[0];
  const changes: MutationChange[] = [];
  for (const [field, value] of Object.entries(args.set)) {
    const current = (item as unknown as Record<string, unknown>)[field];
    if (current !== value) {
      changes.push({ entity_type: 'item', entity_id: item.id, entity_name: item.name, field, before: current, after: value });
    }
  }
  return {
    summary: `Update "${item.name}" (${changes.length} change(s)).`,
    destructive: changes.some((c) => c.field === 'is_active' && c.after === false),
    affected_count: 1,
    changes,
    resolved: { itemIds: [item.id] },
  };
}

export function previewUpdateCategory(
  graph: MenuGraph,
  args: { category_id?: string; category_name?: string; set: Record<string, unknown> },
): ComputedPreview {
  const cats = args.category_id
    ? graph.categories.filter((c) => c.id === args.category_id)
    : args.category_name
      ? resolveCategory(graph, args.category_name)
      : [];
  if (cats.length === 0) {
    return {
      summary: 'Category not found. Use get_menu_structure to list them.',
      destructive: false,
      affected_count: 0,
      changes: [],
      resolved: {},
    };
  }
  const cat = cats[0];
  const changes: MutationChange[] = [];
  for (const [field, value] of Object.entries(args.set)) {
    const current = (cat as unknown as Record<string, unknown>)[field];
    if (current !== value) {
      changes.push({ entity_type: 'category', entity_id: cat.id, entity_name: cat.name, field, before: current, after: value });
    }
  }
  return {
    summary: `Update category "${cat.name}" (${changes.length} change(s)).`,
    destructive: false,
    affected_count: 1,
    changes,
    resolved: { categoryId: cat.id },
  };
}

export function previewUpdateMenu(
  graph: MenuGraph,
  args: { menu_id?: string; menu_name?: string; set: Record<string, unknown> },
): ComputedPreview {
  const menus = args.menu_id ? graph.menus.filter((m) => m.id === args.menu_id) : args.menu_name ? resolveMenu(graph, args.menu_name) : [];
  if (menus.length === 0) {
    return {
      summary: 'Menu not found. Use get_menu_structure to list them.',
      destructive: false,
      affected_count: 0,
      changes: [],
      resolved: {},
    };
  }
  const menu = menus[0];
  const changes: MutationChange[] = [];
  for (const [field, value] of Object.entries(args.set)) {
    const current = (menu as unknown as Record<string, unknown>)[field];
    if (current !== value) {
      changes.push({ entity_type: 'menu', entity_id: menu.id, entity_name: menu.name, field, before: current, after: value });
    }
  }
  return {
    summary: `Update menu "${menu.name}" (${changes.length} change(s)).`,
    destructive: false,
    affected_count: 1,
    changes,
    resolved: { menuId: menu.id },
  };
}

// Copies the category tree from an existing menu when create_menu asks for it.
export function copyTreeFromMenu(graph: MenuGraph, menuId: string): { sourceMenuId: string } | null {
  return graph.menus.some((m) => m.id === menuId) ? { sourceMenuId: menuId } : null;
}

export function menuNameOf(graph: MenuGraph, menuId: string): string {
  return graph.menus.find((m) => m.id === menuId)?.name ?? menuId;
}

export function categoryNameOf(graph: MenuGraph, categoryId: string): string {
  return categoryName(graph, categoryId);
}
