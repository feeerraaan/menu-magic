// Executor — the ONLY code allowed to mutate the database on the Copilot's behalf. It runs
// after an owner-confirmed preview (status 'confirmed'), applies the diff from resolver.ts
// using the user's RLS-scoped client (same tables/writes as the manual editor), and returns
// the affected_rows that the Edge Function writes back to the ai_copilot_actions audit row.
// See docs/FEATURE_SPECIFICATIONS.md §Phase 6 and docs/AI_ARCHITECTURE.md §3.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import type { ComputedPreview } from './resolver.ts';
import type { MenuGraph } from './resolver.ts';

export interface ExecutedChange {
  entity_type: string;
  entity_id: string;
  entity_name: string;
  field: string;
  before: unknown;
  after: unknown;
}

export interface ExecutorResult {
  applied: number;
  changes: ExecutedChange[];
}

interface RowWithId {
  id: string;
  name: string;
}

async function fetchRows<T extends RowWithId>(
  supabase: SupabaseClient,
  table: 'items' | 'categories' | 'menus',
  ids: string[],
): Promise<T[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from(table).select('id, name').in('id', ids);
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function executePreview(
  supabase: SupabaseClient,
  graph: MenuGraph,
  toolName: string,
  preview: ComputedPreview,
): Promise<ExecutorResult> {
  const changes: ExecutedChange[] = [...preview.changes];
  let applied = 0;

  switch (toolName) {
    case 'bulk_adjust_prices':
    case 'bulk_update_dietary_flags': {
      const itemIds = preview.resolved.itemIds ?? [];
      for (const change of preview.changes) {
        const { entity_id: itemId, field, after } = change;
        if (itemId === '__new__' || itemId === '__deleted__') continue;
        const { error } = await supabase.from('items').update({ [field]: after }).eq('id', itemId);
        if (error) throw error;
        applied++;
      }
      if (itemIds.length === 0) {
        return { applied: 0, changes: [] };
      }
      break;
    }

    case 'create_category': {
      const payload = preview.payload as { name: string; description: string | null } | undefined;
      const menuId = preview.resolved.menuId;
      if (!payload || !menuId) throw new Error('Falta la información de la categoría a crear');
      const { data, error } = await supabase
        .from('categories')
        .insert({ menu_id: menuId, name: payload.name, description: payload.description, is_active: true })
        .select('id')
        .single();
      if (error) throw error;
      applied = 1;
      changes[0] = { ...changes[0], entity_id: (data as { id: string }).id };
      break;
    }

    case 'create_item': {
      const payload = preview.payload as Record<string, unknown> | undefined;
      const categoryId = preview.resolved.categoryId;
      if (!payload || !categoryId) throw new Error('Falta la información del plato a crear');
      const { data, error } = await supabase
        .from('items')
        .insert({ category_id: categoryId, ...payload, is_active: false, display_order: 999 })
        .select('id')
        .single();
      if (error) throw error;
      applied = 1;
      changes[0] = { ...changes[0], entity_id: (data as { id: string }).id };
      break;
    }

    case 'generate_new_items': {
      const proposals = preview.payload?.items as Array<Record<string, unknown>> | undefined;
      const categoryId = preview.resolved.categoryId;
      if (!proposals || !categoryId) throw new Error('Falta la información de los platos a generar');
      for (const proposal of proposals) {
        const { data, error } = await supabase
          .from('items')
          .insert({ category_id: categoryId, ...proposal, is_active: false, display_order: 999 })
          .select('id')
          .single();
        if (error) throw error;
        applied++;
        changes.push({
          entity_type: 'item',
          entity_id: (data as { id: string }).id,
          entity_name: (proposal.name as string) ?? 'nuevo plato',
          field: 'created',
          before: null,
          after: proposal,
        });
      }
      break;
    }

    case 'update_item': {
      const ids = preview.resolved.itemIds ?? [];
      const rows = await fetchRows<ItemRowLite>(supabase, 'items', ids);
      for (const change of preview.changes) {
        const { entity_id: itemId, field, after } = change;
        const row = rows.find((r) => r.id === itemId);
        const { error } = await supabase.from('items').update({ [field]: after }).eq('id', itemId);
        if (error) throw error;
        applied++;
        changes.push({ entity_type: 'item', entity_id: itemId, entity_name: row?.name ?? itemId, field, before: change.before, after });
      }
      break;
    }

    case 'update_category': {
      const categoryId = preview.resolved.categoryId;
      if (!categoryId) throw new Error('Falta la categoría a actualizar');
      const { data: row } = await supabase.from('categories').select('name').eq('id', categoryId).single();
      for (const change of preview.changes) {
        const { field, after } = change;
        const { error } = await supabase.from('categories').update({ [field]: after }).eq('id', categoryId);
        if (error) throw error;
        applied++;
        changes.push({ entity_type: 'category', entity_id: categoryId, entity_name: (row as { name?: string } | null)?.name ?? categoryId, field, before: change.before, after });
      }
      break;
    }

    case 'update_menu': {
      const menuId = preview.resolved.menuId;
      if (!menuId) throw new Error('Falta el menú a actualizar');
      const { data: row } = await supabase.from('menus').select('name').eq('id', menuId).single();
      for (const change of preview.changes) {
        const { field, after } = change;
        const { error } = await supabase.from('menus').update({ [field]: after }).eq('id', menuId);
        if (error) throw error;
        applied++;
        changes.push({ entity_type: 'menu', entity_id: menuId, entity_name: (row as { name?: string } | null)?.name ?? menuId, field, before: change.before, after });
      }
      break;
    }

    case 'create_menu': {
      const payload = preview.payload as Record<string, unknown> | undefined;
      if (!payload) throw new Error('Falta la información del menú a crear');
      const { data, error } = await supabase
        .from('menus')
        .insert({
          restaurant_id: graph.restaurantId,
          name: payload.name,
          description: payload.description ?? null,
          is_active: payload.is_active !== false,
          display_order: graph.menus.length,
        })
        .select('id')
        .single();
      if (error) throw error;
      const newMenuId = (data as { id: string }).id;
      applied = 1;
      changes[0] = { ...changes[0], entity_id: newMenuId };

      // Optional: copy the category/items tree from another menu.
      const copyFromMenuId = payload.copyFromMenuId as string | null | undefined;
      if (copyFromMenuId) {
        const { data: sourceCategories } = await supabase
          .from('categories')
          .select('id, name, description, display_order')
          .eq('menu_id', copyFromMenuId)
          .order('display_order');
        for (const srcCat of (sourceCategories ?? []) as Array<{ id: string; name: string; description: string | null; display_order: number }>) {
          const { data: newCat, error: catError } = await supabase
            .from('categories')
            .insert({ menu_id: newMenuId, name: srcCat.name, description: srcCat.description, display_order: srcCat.display_order, is_active: true })
            .select('id')
            .single();
          if (catError) throw catError;
          applied++;
          const { data: sourceItems } = await supabase
            .from('items')
            .select('name, description, price, is_active, is_vegetarian, is_vegan, is_spicy, is_gluten_free, allergens, display_order, photo_url')
            .eq('category_id', srcCat.id)
            .order('display_order');
          for (const srcItem of (sourceItems ?? []) as Array<Record<string, unknown>>) {
            const { error: itemError } = await supabase
              .from('items')
              .insert({ category_id: (newCat as { id: string }).id, ...srcItem });
            if (itemError) throw itemError;
            applied++;
          }
        }
      }
      break;
    }

    case 'bulk_translate': {
      // Translations were generated during preview and are stored in preview.payload; the
      // executor persists them on the resolved item/category rows. See the bulk_translate
      // preview builder in copilotAgent.ts for the payload shape.
      const language = preview.resolved.language;
      const itemTranslations = preview.payload?.itemTranslations as Record<string, { name?: string; description?: string | null }> | undefined;
      const categoryTranslations = preview.payload?.categoryTranslations as Record<string, { name?: string; description?: string | null }> | undefined;
      if (!language) throw new Error('Falta el idioma para la traducción');

      for (const [itemId, t] of Object.entries(itemTranslations ?? {})) {
        const { error } = await supabase.from('item_translations').upsert(
          { item_id: itemId, language, name: t.name ?? '', description: t.description ?? null, generated_by: 'ai_generated' },
          { onConflict: 'item_id,language' },
        );
        if (error) throw error;
        applied++;
        changes.push({ entity_type: 'item', entity_id: itemId, entity_name: itemId, field: `translation[${language}]`, before: null, after: t });
      }
      for (const [categoryId, t] of Object.entries(categoryTranslations ?? {})) {
        const { error } = await supabase.from('category_translations').upsert(
          { category_id: categoryId, language, name: t.name ?? '', description: t.description ?? null, generated_by: 'ai_generated' },
          { onConflict: 'category_id,language' },
        );
        if (error) throw error;
        applied++;
        changes.push({ entity_type: 'category', entity_id: categoryId, entity_name: categoryId, field: `translation[${language}]`, before: null, after: t });
      }
      break;
    }

    default:
      throw new Error(`Tool "${toolName}" is not executable`);
  }

  return { applied, changes };
}

interface ItemRowLite {
  id: string;
  name: string;
}
