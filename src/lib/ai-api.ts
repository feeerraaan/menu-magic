import { supabase } from '@/integrations/supabase/client';
import type { GenerateDescriptionInput, GenerateDescriptionResult } from '@ai/description';
import type { TranslateFieldInput, TranslateFieldResult } from '@ai/translation';
import type { OptimizerOutput, MenuScoreHistoryEntry } from '@ai/optimizer';
import type { MenuImportStartInput, MenuImportStartResponse, MenuImportResult } from '@ai/menuImport';
import type { AiJob } from '@ai/common';
import type {
  CopilotStartConversationInput,
  CopilotStartConversationResponse,
  CopilotMessageInput,
  CopilotMessageTurn,
  CopilotConfirmPreviewInput,
  CopilotConfirmPreviewResponse,
  CopilotCancelPreviewInput,
  CopilotCancelPreviewResponse,
  CopilotHistoryInput,
  CopilotHistoryResponse,
  CopilotListConversationsInput,
  CopilotListConversationsResponse,
} from '@ai/copilot';
import type { InsightsRunInput, InsightsRunResponse, InsightsRecommendation } from '@ai/insights';

// One function per AI operation, mirroring src/lib/api.ts's convention. Every call goes
// through supabase.functions.invoke — never a direct provider/agent import (see
// docs/AI_ARCHITECTURE.md §1 and §5).

export async function generateItemDescription(
  input: GenerateDescriptionInput,
): Promise<GenerateDescriptionResult> {
  const { data, error } = await supabase.functions.invoke('ai-generate-description', {
    body: input,
  });
  if (error) throw error;
  return data as GenerateDescriptionResult;
}

export async function translateField(input: TranslateFieldInput): Promise<TranslateFieldResult> {
  const { data, error } = await supabase.functions.invoke('ai-translate', {
    body: input,
  });
  if (error) throw error;
  return data as TranslateFieldResult;
}

export async function runMenuOptimizer(
  restaurantId: string,
): Promise<{ jobId: string; result: OptimizerOutput }> {
  const { data, error } = await supabase.functions.invoke('ai-optimize-menu', {
    body: { restaurantId },
  });
  if (error) throw error;
  return data as { jobId: string; result: OptimizerOutput };
}

export async function fetchMenuScoreHistory(restaurantId: string): Promise<MenuScoreHistoryEntry[]> {
  const { data, error } = await supabase
    .from('ai_menu_scores')
    .select('id, score, breakdown, created_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as unknown as MenuScoreHistoryEntry[];
}

export async function startMenuImport(input: MenuImportStartInput): Promise<MenuImportStartResponse> {
  const { data, error } = await supabase.functions.invoke('ai-import-start', {
    body: input,
  });
  if (error) throw error;
  return data as MenuImportStartResponse;
}

export async function startAiSetupImport(input: MenuImportStartInput): Promise<MenuImportStartResponse> {
  const { data, error } = await supabase.functions.invoke('ai-import-start', {
    body: { ...input, jobType: 'ai_setup' },
  });
  if (error) throw error;
  return data as MenuImportStartResponse;
}

export async function fetchAiJob(jobId: string): Promise<AiJob> {
  const { data, error } = await supabase
    .from('ai_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  if (error) throw error;
  return data as AiJob;
}

async function invokeCopilot(body: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke('ai-copilot', { body });
  if (error) throw error;
  return data;
}

export async function startCopilotConversation(input: CopilotStartConversationInput): Promise<CopilotStartConversationResponse> {
  return (await invokeCopilot({ action: 'start_conversation', ...input })) as CopilotStartConversationResponse;
}

export async function sendCopilotMessage(input: CopilotMessageInput): Promise<CopilotMessageTurn> {
  return (await invokeCopilot({ action: 'send_message', ...input })) as CopilotMessageTurn;
}

export async function confirmCopilotPreview(input: CopilotConfirmPreviewInput): Promise<CopilotConfirmPreviewResponse> {
  return (await invokeCopilot({ action: 'confirm_preview', ...input })) as CopilotConfirmPreviewResponse;
}

export async function cancelCopilotPreview(input: CopilotCancelPreviewInput): Promise<CopilotCancelPreviewResponse> {
  return (await invokeCopilot({ action: 'cancel_preview', ...input })) as CopilotCancelPreviewResponse;
}

export async function fetchCopilotHistory(input: CopilotHistoryInput): Promise<CopilotHistoryResponse> {
  return (await invokeCopilot({ action: 'get_history', ...input })) as CopilotHistoryResponse;
}

export async function listCopilotConversations(input: CopilotListConversationsInput): Promise<CopilotListConversationsResponse> {
  return (await invokeCopilot({ action: 'list_conversations', ...input })) as CopilotListConversationsResponse;
}

// --- Phase 7: Business Insights + Recommendations ---

export async function runInsights(input: InsightsRunInput): Promise<InsightsRunResponse> {
  const { data, error } = await supabase.functions.invoke('ai-insights', { body: input });
  if (error) throw error;
  return data as InsightsRunResponse;
}

export async function fetchRecommendations(restaurantId: string): Promise<InsightsRecommendation[]> {
  const { data, error } = await supabase
    .from('ai_recommendations')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as InsightsRecommendation[];
}

export async function setRecommendationStatus(
  id: string,
  status: 'dismissed' | 'actioned',
): Promise<void> {
  const { error } = await supabase.from('ai_recommendations').update({ status }).eq('id', id);
  if (error) throw error;
}

interface CommitImportedMenuInput {
  restaurantId: string;
  menuName: string;
  categories: MenuImportResult['categories'];
  translationsByLanguage: MenuImportResult['translationsByLanguage'];
}

/**
 * Persists an owner-reviewed import result as real menus/categories/items, using the exact
 * same tables/writes as the manual editor (createMenu/createCategory/createItem-equivalent
 * inserts) — this is a normal authenticated write respecting RLS, not an AI operation, so it
 * doesn't go through an Edge Function.
 */
export async function commitImportedMenu(input: CommitImportedMenuInput): Promise<{ menuId: string }> {
  const { data: menu, error: menuError } = await supabase
    .from('menus')
    .insert({ restaurant_id: input.restaurantId, name: input.menuName, is_active: true })
    .select('id')
    .single();
  if (menuError) throw menuError;
  const menuId = menu.id as string;

  for (let categoryIndex = 0; categoryIndex < input.categories.length; categoryIndex++) {
    const category = input.categories[categoryIndex];
    const { data: newCategory, error: categoryError } = await supabase
      .from('categories')
      .insert({
        menu_id: menuId,
        name: category.name,
        description: category.description ?? null,
        display_order: categoryIndex,
      })
      .select('id')
      .single();
    if (categoryError) throw categoryError;
    const categoryId = newCategory.id as string;

    for (const [lang, translation] of Object.entries(input.translationsByLanguage)) {
      const translatedCategory = translation.categories[categoryIndex];
      if (!translatedCategory) continue;
      await supabase.from('category_translations').insert({
        category_id: categoryId,
        language: lang,
        name: translatedCategory.name,
        description: translatedCategory.description ?? null,
        generated_by: 'ai_generated',
      });
    }

    for (let itemIndex = 0; itemIndex < category.items.length; itemIndex++) {
      const item = category.items[itemIndex];
      const { data: newItem, error: itemError } = await supabase
        .from('items')
        .insert({
          category_id: categoryId,
          name: item.name,
          description: item.description ?? null,
          price: item.price ?? null,
          is_vegetarian: item.isVegetarian ?? false,
          is_vegan: item.isVegan ?? false,
          is_spicy: item.isSpicy ?? false,
          is_gluten_free: item.isGlutenFree ?? false,
          allergens: item.allergens ?? [],
          display_order: itemIndex,
          is_active: true,
        })
        .select('id')
        .single();
      if (itemError) throw itemError;
      const itemId = newItem.id as string;

      for (const [lang, translation] of Object.entries(input.translationsByLanguage)) {
        const translatedItem = translation.categories[categoryIndex]?.items[itemIndex];
        if (!translatedItem) continue;
        await supabase.from('item_translations').insert({
          item_id: itemId,
          language: lang,
          name: translatedItem.name,
          description: translatedItem.description ?? null,
          generated_by: 'ai_generated',
        });
      }
    }
  }

  return { menuId };
}
