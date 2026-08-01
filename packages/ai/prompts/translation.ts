// Pure template function — no I/O. Edge-Function-only.

import type { LLMMessage } from '../providers/types.ts';

export function buildTranslationPrompt(
  text: string,
  sourceLocale: string,
  targetLocale: string,
  context?: string,
): { system: string; messages: LLMMessage[] } {
  const system = [
    'Eres un traductor experto especializado en menús de restaurantes.',
    'Traduces contenido gastronómico preservando el significado culinario real — nunca traduces palabra por palabra.',
    'Si un plato o ingrediente tiene un nombre local o tradicional sin equivalente directo, consérvalo tal cual y añade una breve explicación entre paréntesis en el idioma de destino, en vez de inventar una traducción literal incorrecta.',
    `Traduce del idioma de código "${sourceLocale}" al idioma de código "${targetLocale}".`,
    context ? `Contexto: ${context}.` : null,
    'Responde EXCLUSIVAMENTE con un objeto JSON válido de la forma {"translatedText": "..."}. Sin texto adicional, sin markdown.',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    system,
    messages: [{ role: 'user', content: text }],
  };
}

// Used by AI Import (Phase 4) to translate an entire extracted menu tree in ONE call per
// target language, rather than one call per field — reduces a large import from potentially
// hundreds of translation calls to one per supported language.
export interface MenuBatchTranslationInput {
  menuName: string;
  categories: Array<{
    name: string;
    description?: string | null;
    items: Array<{ name: string; description?: string | null }>;
  }>;
}

const BATCH_RESPONSE_SHAPE = [
  '{"menuName": string, "categories": [',
  '{"name": string, "description": string|null, "items": [{"name": string, "description": string|null}]}',
  ']}',
].join(' ');

export function buildMenuBatchTranslationPrompt(
  input: MenuBatchTranslationInput,
  sourceLocale: string,
  targetLocale: string,
): { system: string; messages: LLMMessage[] } {
  const system = [
    'Eres un traductor experto especializado en menús de restaurantes.',
    'Traduces contenido gastronómico preservando el significado culinario real — nunca traduces palabra por palabra.',
    'Si un plato tiene un nombre local o tradicional sin equivalente directo, consérvalo y añade una breve explicación entre paréntesis en el idioma de destino.',
    `Traduce TODO el árbol de menú (nombre del menú, cada categoría y cada plato) del idioma "${sourceLocale}" al idioma "${targetLocale}".`,
    'Devuelve EXACTAMENTE la misma estructura y el mismo número de categorías y platos, en el mismo orden — solo traduces los textos, nunca añades, quitas o reordenas elementos.',
    `Responde EXCLUSIVAMENTE con un objeto JSON válido con esta forma exacta: ${BATCH_RESPONSE_SHAPE}. Sin texto adicional, sin markdown.`,
  ].join(' ');

  return {
    system,
    messages: [{ role: 'user', content: JSON.stringify(input) }],
  };
}
