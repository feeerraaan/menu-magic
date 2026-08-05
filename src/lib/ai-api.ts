import { supabase } from '@/integrations/supabase/client';
import { assertWithinLimits, fetchSubscription } from '@/lib/api';
import { getPlanLimits, PlanType } from '@/lib/subscription-limits';
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
import type {
  CustomerAssistantSendInput,
  CustomerAssistantSendResponse,
} from '@ai/customerAssistant';

// One function per AI operation, mirroring src/lib/api.ts's convention. Every call goes
// through supabase.functions.invoke — never a direct provider/agent import (see
// docs/AI_ARCHITECTURE.md §1 and §5).

// Edge Functions signal failure with a non-2xx status; supabase-js wraps that in a
// FunctionsHttpError whose .message is the useless generic 'Edge Function returned a
// non-2xx status code'. The real reason lives in the response body ({ error: string }).
// This unwraps it (and special-cases HTTP 402 = AI credit limit with an upgrade hint) so the
// UI can show the actual problem instead of a generic message. See the original bug report.
async function invokeAi<T>(fn: string, body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    const status =
      (error as { context?: { status?: number } }).context?.status ?? 500;
    const serverMessage = await readServerError(error);
    const message =
      status === 402
        ? 'Has agotado los créditos IA de tu plan. Mejora tu plan (Ferreret) para seguir usando la IA.'
        : (serverMessage ?? error.message);
    const wrapped = new Error(message);
    (wrapped as { status?: number }).status = status;
    throw wrapped;
  }
  return data as T;
}

// Extracts the server's { error: string } body from a FunctionsHttpError (which wraps the
// raw Response in .context). Returns null when there's no parseable body.
async function readServerError(error: unknown): Promise<string | null> {
  const context = (error as { context?: Response }).context;
  if (!context || typeof context.json !== 'function') return null;
  try {
    const body = await context.json();
    return typeof body?.error === 'string' && body.error.length > 0 ? body.error : null;
  } catch {
    return null;
  }
}

export async function generateItemDescription(
  input: GenerateDescriptionInput,
): Promise<GenerateDescriptionResult> {
  return invokeAi<GenerateDescriptionResult>('ai-generate-description', input);
}

export async function translateField(input: TranslateFieldInput): Promise<TranslateFieldResult> {
  return invokeAi<TranslateFieldResult>('ai-translate', input);
}

export async function runMenuOptimizer(
  restaurantId: string,
): Promise<{ jobId: string; result: OptimizerOutput }> {
  return invokeAi<{ jobId: string; result: OptimizerOutput }>('ai-optimize-menu', { restaurantId });
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

/**
 * Credits spent this billing period (or this month when the subscription has no
 * current_period_start), via the get_ai_credits_used_this_period SECURITY DEFINER function —
 * safe to call from the client; the owner can only ever read their own restaurant's usage.
 */
export async function fetchAiCreditsUsed(restaurantId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_ai_credits_used_this_period', {
    _restaurant_id: restaurantId,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function startMenuImport(input: MenuImportStartInput): Promise<MenuImportStartResponse> {
  return invokeMenuImportBackend(input);
}

export async function startAiSetupImport(input: MenuImportStartInput): Promise<MenuImportStartResponse> {
  return invokeMenuImportBackend({ ...input, jobType: 'ai_setup' });
}

/**
 * Long menu imports run through the Vercel Node function in production. The old Edge Function
 * remains available for local development and as a controlled rollback via
 * VITE_AI_IMPORT_BACKEND=edge. Set VITE_AI_IMPORT_BACKEND=vercel to force the Vercel route in
 * another environment.
 */
async function invokeMenuImportBackend(input: MenuImportStartInput): Promise<MenuImportStartResponse> {
  const configuredBackend = import.meta.env.VITE_AI_IMPORT_BACKEND;
  const useVercelBackend = configuredBackend === 'vercel' ||
    (configuredBackend !== 'edge' && import.meta.env.PROD);
  if (!useVercelBackend) {
    return invokeAi<MenuImportStartResponse>('ai-import-start', input);
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Tu sesión ha caducado. Vuelve a iniciar sesión.');
  const response = await fetch('/api/ai-import-start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(typeof payload?.error === 'string' ? payload.error : `Importación fallida (${response.status})`);
    (error as { status?: number }).status = response.status;
    throw error;
  }
  return payload as MenuImportStartResponse;
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

/**
 * Executes exactly one step of a menu import (prepare / one chunk extraction / one language
 * translation) on the Vercel backend and returns the fresh job row. The frontend drives the
 * loop, so each invocation is short and a menu of any length can be imported without hitting
 * Vercel's per-function duration cap. Retries transient failures since a step reads the job's
 * persisted state fresh on each call, so retrying is safe.
 */
export async function continueImportStep(jobId: string): Promise<AiJob> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Tu sesión ha caducado. Vuelve a iniciar sesión.');
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch('/api/ai-import-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ jobId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) return payload as AiJob;
      lastError = new Error(
        typeof payload?.error === 'string' && payload.error.length > 0
          ? payload.error
          : `Error en la importación (${response.status})`,
      );
    } catch (e) {
      lastError = e as Error;
    }
    await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
  }
  throw lastError ?? new Error('No se pudo continuar la importación');
}

async function invokeCopilot(body: Record<string, unknown>): Promise<unknown> {
  return invokeAi<unknown>('ai-copilot', body);
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
  return invokeAi<InsightsRunResponse>('ai-insights', input);
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

// --- Phase 8: Customer Assistant (anonymous public chat) ---

export async function sendCustomerAssistantMessage(
  input: CustomerAssistantSendInput,
): Promise<CustomerAssistantSendResponse> {
  return invokeAi<CustomerAssistantSendResponse>('ai-customer-assistant', input);
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
 *
 * Enforces the plan's real limits BEFORE writing anything: an import must not exceed the
 * subscription's menus/categories/items/languages quotas (verified against actual DB counts,
 * not local UI state). Throws a clear upgrade-prompt error when it would.
 */
export async function commitImportedMenu(input: CommitImportedMenuInput): Promise<{ menuId: string }> {
  const addedItems = input.categories.reduce((sum, c) => sum + c.items.length, 0);

  // Reuse an existing empty menu when present (e.g. the auto-created "Main Menu" from
  // onboarding): the import lands its categories inside it instead of creating a new menu,
  // so a free plan (1 menu) can import without needing a menu slot.
  const emptyMenu = await findEmptyMenu(input.restaurantId);

  await assertWithinLimits(input.restaurantId, {
    menus: emptyMenu ? 0 : 1,
    categories: input.categories.length,
    items: addedItems,
  });

  // Imported translations must not exceed the plan's language quota either — the restaurant's
  // supported_languages should already respect it, but guard against a stale config.
  const supportedLanguages = (await fetchRestaurantSupportedLanguages(input.restaurantId));
  const plan = await getPlanTypeForRestaurant(input.restaurantId);
  const languageLimit = getPlanLimits(plan).languages;
  if (supportedLanguages.length > languageLimit) {
    throw new Error(
      `Este restaurante tiene ${supportedLanguages.length} idiomas, más del límite de tu plan (${languageLimit}). Quita idiomas en Ajustes para importar.`,
    );
  }

  let menuId: string;
  if (emptyMenu) {
    menuId = emptyMenu;
  } else {
    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .insert({ restaurant_id: input.restaurantId, name: input.menuName, is_active: true })
      .select('id')
      .single();
    if (menuError) throw menuError;
    menuId = menu.id as string;
  }

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

  // When reusing an empty menu (e.g. the auto-created "Main Menu"), rename it to the
  // imported menu's name so the public page shows the right title.
  if (emptyMenu) {
    await supabase.from('menus').update({ name: input.menuName }).eq('id', emptyMenu);
  }

  return { menuId };
}

async function findEmptyMenu(restaurantId: string): Promise<string | null> {
  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('restaurant_id', restaurantId);
  const menuIds = (menus ?? []).map((m) => m.id as string);
  if (menuIds.length === 0) return null;

  const { data: categories } = await supabase
    .from('categories')
    .select('menu_id')
    .in('menu_id', menuIds);
  const usedMenuIds = new Set((categories ?? []).map((c) => (c as { menu_id: string }).menu_id));
  return menuIds.find((id) => !usedMenuIds.has(id)) ?? null;
}

async function fetchRestaurantSupportedLanguages(restaurantId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('supported_languages')
    .eq('id', restaurantId)
    .maybeSingle();
  if (error) throw error;
  return (data as { supported_languages?: string[] } | null)?.supported_languages ?? [];
}

async function getPlanTypeForRestaurant(restaurantId: string): Promise<PlanType> {
  const sub = await fetchSubscription(restaurantId);
  return (sub?.plan ?? 'free') as PlanType;
}
