// Pure template function — no I/O, no provider awareness. Edge-Function-only (imports a
// Deno-only type from ../providers/types.ts), but contains no Deno-specific code itself.

import type { LLMMessage } from '../providers/types.ts';
import type { DescriptionStyle } from '../schemas/description.ts';

export interface DescriptionPromptItem {
  name: string;
  existingDescription?: string | null;
  categoryName?: string | null;
  dietary: { vegetarian: boolean; vegan: boolean; spicy: boolean; glutenFree: boolean };
  allergens: string[];
  price?: number | null;
  currency?: string | null;
}

const STYLE_GUIDANCE: Record<DescriptionStyle, string> = {
  luxury: 'Lujoso y exclusivo: lenguaje evocador, ingredientes destacados, sensación premium, sin caer en la exageración vacía.',
  traditional: 'Tradicional y auténtico: enfatiza receta casera, origen e historia culinaria.',
  modern: 'Moderno y fresco: directo, contemporáneo, apto para un público joven.',
  casual: 'Casual y cercano: tono amigable y sencillo, sin tecnicismos.',
  fine_dining: 'Alta cocina: preciso, técnico solo cuando aporte valor, elegante y conciso.',
};

export function buildDescriptionPrompt(
  item: DescriptionPromptItem,
  style: DescriptionStyle,
  locale: string,
): { system: string; messages: LLMMessage[] } {
  const system = [
    'Eres un copywriter experto en menús de restaurantes.',
    'Generas UNA sola descripción de plato, breve (máximo 2 frases, ~180 caracteres), apetitosa y honesta.',
    'Nunca inventes ingredientes, alérgenos o afirmaciones dietéticas que no se te den — describe solo con la información proporcionada.',
    `Estilo pedido: ${STYLE_GUIDANCE[style]}`,
    `Responde SIEMPRE en el idioma de código "${locale}".`,
    'Responde EXCLUSIVAMENTE con un objeto JSON válido de la forma {"description": "..."}. Sin texto adicional, sin markdown.',
  ].join(' ');

  const details = [
    `Plato: ${item.name}`,
    item.categoryName ? `Categoría: ${item.categoryName}` : null,
    item.existingDescription
      ? `Descripción actual (mejórala o reescríbela, no la ignores): ${item.existingDescription}`
      : null,
    item.dietary.vegetarian ? 'Vegetariano' : null,
    item.dietary.vegan ? 'Vegano' : null,
    item.dietary.spicy ? 'Picante' : null,
    item.dietary.glutenFree ? 'Sin gluten' : null,
    item.allergens.length ? `Alérgenos: ${item.allergens.join(', ')}` : null,
    item.price != null ? `Precio: ${item.price}${item.currency ? ' ' + item.currency : ''}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    system,
    messages: [{ role: 'user', content: details }],
  };
}
