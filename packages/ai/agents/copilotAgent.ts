// Copilot agent orchestration — the multi-turn function-calling loop. Edge-Function-only.
//
// Safety model (docs/FEATURE_SPECIFICATIONS.md §Phase 6):
//   1. The provider is called with the full tool set, tool_choice 'auto' (validated live —
//      'required' is rejected by OpenCode Zen's DeepSeek thinking-mode).
//   2. Read-only tools (search_items, get_menu_structure) execute immediately and their
//      results feed back into the loop.
//   3. Mutating tools NEVER execute here: the deterministic resolver computes a before/after
//      preview, the Edge Function persists it as a pending ai_copilot_actions row, and the
//      loop stops. Only an owner-confirmed preview triggers executor.ts writes.

import type { LLMProvider, LLMMessage, LLMToolCall } from '../providers/types.ts';
import {
  COPILOT_TOOLS,
  MUTATING_TOOLS,
} from '../tools/definitions.ts';
import {
  matchItems,
  previewBulkAdjustPrices,
  previewBulkUpdateDietaryFlags,
  previewCreateCategory,
  previewCreateItem,
  previewUpdateItem,
  previewUpdateCategory,
  previewUpdateMenu,
  copyTreeFromMenu,
  type ComputedPreview,
  type MenuGraph,
} from '../tools/resolver.ts';
import { translateText } from '../agents/translationAgent.ts';
import { buildCopilotSystemPrompt, buildRestaurantSummary } from '../prompts/copilot.ts';

export const MAX_LOOP_ITERATIONS = 8;

export interface CopilotTurnResult {
  // Final assistant text (when the loop ended without a mutating tool).
  reply?: string;
  // Set when the loop stopped on a mutating tool — a preview awaiting confirmation.
  preview?: {
    toolName: string;
    rawLlmInput: Record<string, unknown>;
    computed: ComputedPreview;
  };
  // The final message history so the Edge Function can persist tool/user turns.
  messages: LLMMessage[];
}

function parseToolArgs(toolCall: LLMToolCall): Record<string, unknown> {
  try {
    const parsed = JSON.parse(toolCall.arguments || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function readToolResult(toolName: string, args: Record<string, unknown>, graph: MenuGraph): string {
  if (toolName === 'get_menu_structure') {
    const structure = graph.menus.map((m) => ({
      id: m.id,
      name: m.name,
      is_active: m.is_active,
      categories: graph.categories
        .filter((c) => c.menu_id === m.id)
        .map((c) => ({
          id: c.id,
          name: c.name,
          items: graph.items.filter((i) => i.category_id === c.id).length,
        })),
    }));
    return JSON.stringify(structure);
  }
  if (toolName === 'search_items') {
    const items = matchItems(graph, {
      name_contains: args.name_contains as string | undefined,
      category_name_contains: args.category_name_contains as string | undefined,
      price_min: args.price_min as number | undefined,
      price_max: args.price_max as number | undefined,
      is_vegetarian: args.is_vegetarian as boolean | undefined,
      is_vegan: args.is_vegan as boolean | undefined,
      is_spicy: args.is_spicy as boolean | undefined,
      is_gluten_free: args.is_gluten_free as boolean | undefined,
      is_active: args.is_active as boolean | undefined,
    });
    return JSON.stringify(
      items.map((i) => ({
        id: i.id,
        name: i.name,
        category_name: graph.categories.find((c) => c.id === i.category_id)?.name ?? null,
        price: i.price,
        description: i.description,
        is_active: i.is_active,
        is_vegetarian: i.is_vegetarian,
        is_vegan: i.is_vegan,
        is_spicy: i.is_spicy,
        is_gluten_free: i.is_gluten_free,
        allergens: i.allergens ?? [],
      })),
    );
  }
  return JSON.stringify({ error: `Tool "${toolName}" no existe` });
}

// Preview builders that need an LLM call of their own (generation / translation). They
// produce the payload that executor.ts will persist verbatim on confirmation.
async function computeGenerativePreview(
  provider: LLMProvider,
  graph: MenuGraph,
  toolName: string,
  args: Record<string, unknown>,
): Promise<ComputedPreview> {
  if (toolName === 'generate_new_items') {
    const categories = args.category_id
      ? graph.categories.filter((c) => c.id === args.category_id)
      : args.category_name_or_id
        ? graph.categories.filter((c) => c.id === args.category_name_or_id || c.name.toLowerCase() === String(args.category_name_or_id).toLowerCase())
        : [];
    if (categories.length === 0) {
      return {
        summary: 'No se encontró la categoría destino. Usa get_menu_structure para ver las categorías existentes.',
        destructive: false,
        affected_count: 0,
        changes: [],
        resolved: {},
      };
    }
    const category = categories[0];
    const count = Math.min(10, Math.max(1, typeof args.count === 'number' ? args.count : 1));
    const proposals = await generateItemProposals(
      provider,
      String(args.criteria ?? ''),
      category.name,
      graph.currency,
      count,
      typeof args.price_hint === 'number' ? args.price_hint : undefined,
    );
    return {
      summary: `Generar ${proposals.length} plato(s) propuesto(s) en "${category.name}" — se crearán OCULTOS (is_active=false) para que los revises antes de publicar.`,
      destructive: false,
      affected_count: proposals.length,
      changes: proposals.map((p) => ({
        entity_type: 'item',
        entity_id: '__new__',
        entity_name: String(p.name ?? 'nuevo plato'),
        field: 'created',
        before: null,
        after: p,
      })),
      resolved: { categoryId: category.id },
      payload: { items: proposals },
    };
  }

  if (toolName === 'bulk_translate') {
    const language = String(args.language ?? '').toLowerCase();
    if (!language) {
      return {
        summary: 'Falta el idioma destino (campo "language").',
        destructive: false,
        affected_count: 0,
        changes: [],
        resolved: {},
      };
    }
    if (!graph.supportedLanguages.includes(language)) {
      return {
        summary: `El idioma "${language}" no está entre los idiomas del restaurante (${graph.supportedLanguages.join(', ')}). Actívalo en Ajustes o usa uno de los existentes.`,
        destructive: false,
        affected_count: 0,
        changes: [],
        resolved: {},
      };
    }
    const items = matchItems(graph, {
      name_contains: args.name_contains as string | undefined,
      category_name_contains: args.category_name_contains as string | undefined,
    });
    const itemTranslations: Record<string, { name?: string; description?: string | null }> = {};
    for (const item of items.slice(0, 50)) {
      try {
        const nameResult = await translateText(provider, item.name, graph.defaultLanguage, language, 'nombre de plato');
        let descResult: { translatedText: string } | null = null;
        if (item.description) {
          descResult = await translateText(provider, item.description, graph.defaultLanguage, language, 'descripción de plato');
        }
        itemTranslations[item.id] = {
          name: nameResult.translatedText,
          description: descResult?.translatedText ?? null,
        };
      } catch {
        // skip a single item translation failure; report what succeeded
      }
    }
    return {
      summary: `Traducir ${items.length} plato(s) al "${language}". Las traducciones se guardan solo tras tu confirmación.`,
      destructive: false,
      affected_count: items.length,
      changes: Object.entries(itemTranslations).map(([id, t]) => ({
        entity_type: 'item',
        entity_id: id,
        entity_name: id,
        field: `translation[${language}]`,
        before: null,
        after: t,
      })),
      resolved: { itemIds: Object.keys(itemTranslations), language },
      payload: { itemTranslations, categoryTranslations: {}, language },
    };
  }

  throw new Error(`Tool "${toolName}" no es generativo`);
}

const GENERATED_ITEM_SCHEMA_SHAPE = [
  '[{"name": string, "description": string|null, "price": number|null, "is_vegetarian": bool, "is_vegan": bool, "is_spicy": bool, "is_gluten_free": bool, "allergens": string[]}]',
].join(' ');

async function generateItemProposals(
  provider: LLMProvider,
  criteria: string,
  categoryName: string,
  currency: string,
  count: number,
  priceHint?: number,
): Promise<Array<Record<string, unknown>>> {
  const system = [
    'Eres un ayudante de creación de platos para un restaurante.',
    `Generas ${count} plato(s) nuevo(s) para la categoría "${categoryName}" (moneda ${currency}).`,
    `Criterio: ${criteria}`,
    priceHint ? `Sugerencia de precio: ${priceHint} ${currency}.` : null,
    'Los platos se crearán ocultos para revisión, así que sé creativo pero realista.',
    'Responde EXCLUSIVAMENTE con un array JSON válido de objetos con esta forma: ' + GENERATED_ITEM_SCHEMA_SHAPE + '. Sin texto adicional, sin markdown.',
  ].filter(Boolean).join(' ');

  const ProposalsSchema = {
    parse(data: unknown): Array<Record<string, unknown>> {
      if (!Array.isArray(data)) throw new Error('Se esperaba un array');
      return data as Array<Record<string, unknown>>;
    },
  };

  return provider.generateStructured({
    system,
    messages: [{ role: 'user', content: 'Genera los platos ahora.' }],
    schema: ProposalsSchema,
    temperature: 0.7,
    maxTokens: 1500,
  });
}

// Resolves a mutating tool call into a preview. Never writes. Returns null when the tool is
// read-only (shouldn't happen) so the caller can treat it as unknown.
export async function computePreview(
  provider: LLMProvider,
  graph: MenuGraph,
  toolName: string,
  args: Record<string, unknown>,
): Promise<ComputedPreview | null> {
  switch (toolName) {
    case 'bulk_adjust_prices':
      return previewBulkAdjustPrices(graph, args as never);
    case 'bulk_update_dietary_flags':
      return previewBulkUpdateDietaryFlags(graph, args as never);
    case 'create_category':
      return previewCreateCategory(graph, args as never);
    case 'create_item':
      return previewCreateItem(graph, args as never);
    case 'update_item':
      return previewUpdateItem(graph, args as never);
    case 'update_category':
      return previewUpdateCategory(graph, args as never);
    case 'update_menu':
      return previewUpdateMenu(graph, args as never);
    case 'create_menu': {
      const name = String(args.name ?? '');
      if (!name.trim()) {
        return {
          summary: 'Falta el nombre del menú.',
          destructive: false,
          affected_count: 0,
          changes: [],
          resolved: {},
        };
      }
      const copyFrom = args.copy_items_from_menu_id ? copyTreeFromMenu(graph, String(args.copy_items_from_menu_id)) : null;
      return {
        summary: `Crear menú "${name}"${copyFrom ? ` copiando la estructura de otro menú` : ''}.`,
        destructive: false,
        affected_count: 1,
        changes: [{ entity_type: 'menu', entity_id: '__new__', entity_name: name, field: 'name', before: null, after: name }],
        resolved: {},
        payload: {
          name,
          description: args.description ?? null,
          is_active: args.is_active !== false,
          copyFromMenuId: copyFrom?.sourceMenuId ?? null,
        },
      };
    }
    case 'generate_new_items':
    case 'bulk_translate':
      return computeGenerativePreview(provider, graph, toolName, args);
    default:
      return null;
  }
}

/**
 * Runs one Copilot turn: seed the message history with the restaurant summary + prior
 * conversation, loop through read-only tool calls, and stop on the first mutating tool with
 * a persisted-ready preview.
 */
// NOTE: the loop below needs a prepared MenuGraph + history; the Edge Function
// (ai-copilot/index.ts) loads them and calls runCopilotLoop.
export async function runCopilotLoop(
  provider: LLMProvider,
  graph: MenuGraph,
  history: LLMMessage[],
  userMessage: string,
): Promise<CopilotTurnResult> {
  const messages: LLMMessage[] = [
    { role: 'system', content: buildCopilotSystemPrompt(buildRestaurantSummary(graph)) },
    ...history,
    { role: 'user', content: userMessage },
  ];

  let reply: string | undefined;

  for (let iteration = 0; iteration < MAX_LOOP_ITERATIONS; iteration++) {
    // disableThinking: DeepSeek's thinking-mode requires echoing reasoning_content back on
    // the next turn, which this client doesn't store — disabling thinking makes the multi-turn
    // tool loop work (validated live, see docs/IMPLEMENTATION_PLAN.md Phase 6).
    const result = await provider.complete({ messages, tools: COPILOT_TOOLS, temperature: 0.3, maxTokens: 2000, disableThinking: true });
    const toolCalls = result.toolCalls ?? [];

    if (toolCalls.length === 0) {
      reply = result.text.trim() || 'Hecho. ¿Quieres que haga algo más con el menú?';
      messages.push({ role: 'assistant', content: reply });
      break;
    }

    // Process tool calls sequentially; read-only tools execute, the first mutating tool
    // produces a preview and stops the loop.
    let stoppedOnMutation = false;
    for (const toolCall of toolCalls) {
      const toolName = toolCall.name;
      const args = parseToolArgs(toolCall);

      if (!MUTATING_TOOLS.includes(toolName as never)) {
        const toolResult = readToolResult(toolName, args, graph);
        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: [{ id: toolCall.id, name: toolName, arguments: toolCall.arguments }],
        });
        messages.push({ role: 'tool', tool_call_id: toolCall.id, name: toolName, content: toolResult });
        continue;
      }

      const computed = await computePreview(provider, graph, toolName, args);
      if (computed && computed.affected_count === 0) {
        // Nothing to do — tell the model and keep the loop going.
        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: [{ id: toolCall.id, name: toolName, arguments: toolCall.arguments }],
        });
        messages.push({ role: 'tool', tool_call_id: toolCall.id, name: toolName, content: computed.summary });
        continue;
      }

      stoppedOnMutation = true;
      messages.push({ role: 'assistant', content: result.text ?? null });
      return {
        preview: { toolName, rawLlmInput: args, computed: computed ?? { summary: 'Preview vacío', destructive: false, affected_count: 0, changes: [], resolved: {} } },
        messages,
      };
    }

    if (stoppedOnMutation) break;
  }

  return { reply, messages };
}
