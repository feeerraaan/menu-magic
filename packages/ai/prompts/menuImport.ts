// Pure template function — no I/O. Edge-Function-only.

import type { LLMMessage } from '../providers/types.ts';

const RESPONSE_SHAPE = [
  '{"menuName": string, "categories": [',
  '{"name": string, "description": string|null, "items": [',
  '{"name": string, "description": string|null, "price": number|null,',
  '"isVegetarian": boolean, "isVegan": boolean, "isSpicy": boolean, "isGlutenFree": boolean,',
  '"allergens": string[]}',
  ']}',
  ']}',
].join(' ');

export function buildExtractionPrompt(rawText: string, locale: string): { system: string; messages: LLMMessage[] } {
  const system = [
    'Eres un asistente experto en digitalizar menús de restaurante a partir de texto extraído de un documento, imagen o página web.',
    'Extrae ÚNICAMENTE lo que esté realmente presente en el texto — nunca inventes platos, precios o categorías que no aparezcan.',
    'Agrupa los platos en categorías razonables si el texto no las marca explícitamente (ej: Entrantes, Principales, Postres, Bebidas).',
    'El precio debe ser un número (sin símbolo de moneda) o null si no aparece o es ilegible.',
    'Sé CONSERVADOR con las etiquetas dietéticas (vegetariano/vegano/picante/sin gluten): solo márcalas true si el texto lo indica explícitamente o es evidente sin ambigüedad (ej. "Ensalada de tomate" no es necesariamente vegana si no se especifica el aliño); en caso de duda, usa false. Estas etiquetas afectan la seguridad alimentaria de clientes con alergias, así que nunca las inventes.',
    `El idioma del texto original y de tu respuesta debe ser el de código "${locale}" (no traduzcas).`,
    `Responde EXCLUSIVAMENTE con un objeto JSON válido con esta forma exacta: ${RESPONSE_SHAPE}. Sin texto adicional, sin markdown.`,
  ].join(' ');

  return {
    system,
    messages: [{ role: 'user', content: rawText }],
  };
}
