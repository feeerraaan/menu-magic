// Pure template functions — no I/O. Edge-Function-only.
// Phase 8 — Customer Assistant. Two LLM calls, per the safety design in
// docs/FEATURE_SPECIFICATIONS.md §Phase 8:
//   1. Extract structured constraints from the diner's free text (parsing only).
//   2. Rank/explain WITHIN the deterministic pre-filtered candidate set — the model is never
//      asked to pick from the full menu, so an allergen/diet violation is structurally
//      impossible; server-side validation still re-checks every referenced item id.

import type { LLMMessage } from '../providers/types.ts';

export interface ConstraintExtraction {
  dietary_constraints: string[]; // e.g. ['vegetarian', 'vegan', 'gluten_free', 'spicy', 'not_spicy']
  exclude_allergens: string[]; // e.g. ['gluten', 'lactosa', 'frutos secos', 'marisco']
  exclude_tags: string[]; // e.g. ['carne', 'pescado'] — natural-language exclusions
  max_price: number | null;
  mood_or_craving: string | null;
}

const EXTRACTION_RESPONSE_SHAPE = [
  '{"dietary_constraints": string[], "exclude_allergens": string[],',
  '"exclude_tags": string[], "max_price": number|null, "mood_or_craving": string|null}',
].join(' ');

export function buildConstraintExtractionPrompt(
  message: string,
  restaurantName: string,
): { system: string; messages: LLMMessage[] } {
  const system = [
    `Eres un extractor de restricciones para un comensal en "${restaurantName}".`,
    'Recibes el texto libre de un cliente y extraes sus restricciones dietéticas y de alergias.',
    '"dietary_constraints" puede contener: vegetarian, vegan, gluten_free, spicy, not_spicy.',
    '"exclude_allergens": los alérgenos que debe evitar (p.ej. gluten, lactosa, frutos secos, marisco, huevo, soja).',
    '"exclude_tags": etiquetas genéricas a excluir en lenguaje natural (p.ej. carne, pescado, queso).',
    '"max_price": el presupuesto máximo si lo menciona (número), si no null.',
    '"mood_or_craving": cualquier deseo o humor expresado (p.ej. "algo ligero", "quiero probar algo nuevo").',
    'Sé conservador: si no se menciona una restricción, NO la inventes.',
    `Responde EXCLUSIVAMENTE con un objeto JSON válido de la forma exacta: ${EXTRACTION_RESPONSE_SHAPE}. Sin texto adicional, sin markdown.`,
  ].join(' ');

  return { system, messages: [{ role: 'user', content: message }] };
}

export interface RankedCandidate {
  id: string;
  name: string;
  price: number | null;
  description: string | null;
  category_name: string;
  is_vegan: boolean;
  is_vegetarian: boolean;
  is_spicy: boolean;
  is_gluten_free: boolean;
  allergens: string[];
}

const RANKING_RESPONSE_SHAPE = [
  '{"recommendations": [{"item_id": string, "explanation": string}], "reply": string}',
].join(' ');

export function buildRankingPrompt(input: {
  restaurantName: string;
  currency: string;
  mood_or_craving: string | null;
  candidates: RankedCandidate[];
}): { system: string; messages: LLMMessage[] } {
  const system = [
    `Eres un recomendador de platos en "${input.restaurantName}" (moneda ${input.currency}).`,
    'Recibes una lista de platos CANDIDATOS que YA cumplen todas las restricciones del cliente (filtradas determinísticamente).',
    'Debes rankear y recomendar entre ESOS candidatos SOLO — nunca menciones platos que no estén en la lista.',
    input.mood_or_craving ? `El cliente busca: ${input.mood_or_craving}` : null,
    'Para cada recomendación indica "item_id" (id real del plato en la lista) y una explicación breve (1-2 frases) de por qué encaja.',
    'Elige entre 1 y 4 platos. Si la lista está vacía o nada encaja, devuelve recommendations vacías y en "reply" explica amablemente.',
    'Nunca uses el guion largo (—) en la respuesta. Usa coma, punto o dos puntos.',
    `Responde EXCLUSIVAMENTE con un objeto JSON válido de la forma exacta: ${RANKING_RESPONSE_SHAPE}. Sin texto adicional, sin markdown.`,
  ].filter(Boolean).join(' ');

  const candidates = JSON.stringify(
    input.candidates.map((c) => ({
      id: c.id,
      name: c.name,
      price: c.price,
      description: c.description,
      category_name: c.category_name,
      is_vegan: c.is_vegan,
      is_vegetarian: c.is_vegetarian,
      is_spicy: c.is_spicy,
      is_gluten_free: c.is_gluten_free,
      allergens: c.allergens ?? [],
    })),
  );

  return { system, messages: [{ role: 'user', content: `Candidatos:\n${candidates}` }] };
}
