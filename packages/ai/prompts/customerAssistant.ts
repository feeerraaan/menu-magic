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
  lang: string = 'es',
): { system: string; messages: LLMMessage[] } {
  const isEn = lang === 'en';
  const system = [
    isEn
      ? `You are a dietary constraint extractor for a diner at "${restaurantName}".`
      : `Eres un extractor de restricciones para un comensal en "${restaurantName}".`,
    isEn
      ? "You receive the diner's free text and extract their dietary constraints and allergens."
      : 'Recibes el texto libre de un cliente y extraes sus restricciones dietéticas y de alergias.',
    '"dietary_constraints" can contain: vegetarian, vegan, gluten_free, spicy, not_spicy.',
    isEn
      ? '"exclude_allergens": allergens to avoid (e.g. gluten, lactose, nuts, shellfish, egg, soy).'
      : '"exclude_allergens": los alérgenos que debe evitar (p.ej. gluten, lactosa, frutos secos, marisco, huevo, soja).',
    isEn
      ? '"exclude_tags": generic exclusion tags in natural language (e.g. meat, fish, cheese).'
      : '"exclude_tags": etiquetas genéricas a excluir en lenguaje natural (p.ej. carne, pescado, queso).',
    '"max_price": maximum budget if mentioned (number), otherwise null.',
    isEn
      ? '"mood_or_craving": any desire or mood expressed (e.g. "something light", "want to try something new").'
      : '"mood_or_craving": cualquier deseo o humor expresado (p.ej. "algo ligero", "quiero probar algo nuevo").',
    isEn
      ? 'Be conservative: if a constraint is not mentioned, do NOT invent it.'
      : 'Sé conservador: si no se menciona una restricción, NO la inventes.',
    isEn
      ? `Respond ONLY with a valid JSON object in the exact form: ${EXTRACTION_RESPONSE_SHAPE}. No additional text, no markdown.`
      : `Responde EXCLUSIVAMENTE con un objeto JSON válido de la forma exacta: ${EXTRACTION_RESPONSE_SHAPE}. Sin texto adicional, sin markdown.`,
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
  lang?: string;
}): { system: string; messages: LLMMessage[] } {
  const lang = input.lang ?? 'es';
  const isEn = lang === 'en';
  const system = [
    isEn
      ? `You are a dish recommender at "${input.restaurantName}" (currency ${input.currency}).`
      : `Eres un recomendador de platos en "${input.restaurantName}" (moneda ${input.currency}).`,
    isEn
      ? "You receive a list of CANDIDATE dishes that already meet all the diner's constraints (deterministically filtered)."
      : 'Recibes una lista de platos CANDIDATOS que YA cumplen todas las restricciones del cliente (filtradas determinísticamente).',
    isEn
      ? 'You must rank and recommend only from these candidates. Never mention dishes outside the list.'
      : 'Debes recomendar solo entre esos candidatos. Nunca menciones platos que no estén en la lista.',
    input.mood_or_craving
      ? isEn
        ? `The diner is looking for: ${input.mood_or_craving}`
        : `El cliente busca: ${input.mood_or_craving}`
      : null,
    isEn
      ? 'For each recommendation provide "item_id" (real id from the list) and a brief explanation (1-2 sentences) of why it fits.'
      : 'Para cada recomendación indica "item_id" (id real del plato en la lista) y una explicación breve (1-2 frases) de por qué encaja.',
    isEn
      ? 'Choose between 1 and 4 dishes. If the list is empty or nothing fits, return empty recommendations and explain kindly in "reply".'
      : 'Elige entre 1 y 4 platos. Si la lista está vacía o nada encaja, devuelve recommendations vacías y en "reply" explica amablemente.',
    isEn
      ? 'Do not use long dashes in the reply. Use commas, periods or colons instead.'
      : 'No uses guiones largos en la respuesta. Usa comas, puntos o dos puntos.',
    isEn
      ? `Respond ONLY with a valid JSON object in the exact form: ${RANKING_RESPONSE_SHAPE}. No additional text, no markdown.`
      : `Responde EXCLUSIVAMENTE con un objeto JSON válido de la forma exacta: ${RANKING_RESPONSE_SHAPE}. Sin texto adicional, sin markdown.`,
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

  const label = isEn ? 'Candidates' : 'Candidatos';
  return { system, messages: [{ role: 'user', content: `${label}:\n${candidates}` }] };
}
