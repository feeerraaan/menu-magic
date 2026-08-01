// Phase 8 — Customer Assistant agent. Encapsulates the safety-critical flow from
// docs/FEATURE_SPECIFICATIONS.md §Phase 8:
//   1. extractConstraints() — one LLM call, parses the diner's text into structured filters.
//   2. filterCandidates() — PURE CODE, no LLM: applies every hard constraint against the
//      restaurant's public menu. Zero model involvement in eligibility.
//   3. rankCandidates() — second LLM call, only within the pre-filtered set.
//   4. validateRecommendations() — server-side: drop any item id NOT in the candidate set
//      (hallucination safety net). Model output is filtered again here.

import { z } from 'https://esm.sh/zod@3.25.76';
import type { LLMProvider } from '../providers/types.ts';
import {
  buildConstraintExtractionPrompt,
  buildRankingPrompt,
  type ConstraintExtraction,
  type RankedCandidate,
} from '../prompts/customerAssistant.ts';

const ConstraintExtractionSchema = z.object({
  dietary_constraints: z.array(z.string()).default([]),
  exclude_allergens: z.array(z.string()).default([]),
  exclude_tags: z.array(z.string()).default([]),
  max_price: z.number().nullable().optional(),
  mood_or_craving: z.string().nullable().optional(),
});

const RankingOutputSchema = z.object({
  recommendations: z
    .array(
      z.object({
        item_id: z.string().min(1),
        explanation: z.string().min(1).max(300),
      }),
    )
    .max(4),
  reply: z.string().min(1).max(1200),
});

export interface MenuItemCandidate {
  id: string;
  name: string;
  price: number | null;
  description: string | null;
  category_name: string;
  is_active: boolean;
  is_vegan: boolean;
  is_vegetarian: boolean;
  is_spicy: boolean;
  is_gluten_free: boolean;
  allergens: string[];
}

export async function extractConstraints(
  provider: LLMProvider,
  message: string,
  restaurantName: string,
): Promise<ConstraintExtraction> {
  const { system, messages } = buildConstraintExtractionPrompt(message, restaurantName);
  const result = await provider.generateStructured({
    system,
    messages,
    schema: ConstraintExtractionSchema,
    temperature: 0.1,
    maxTokens: 300,
  });
  // The zod schema fields are optional to be lenient with the model; normalize to the strict
  // interface the pure-code filter consumes.
  return {
    dietary_constraints: result.dietary_constraints ?? [],
    exclude_allergens: result.exclude_allergens ?? [],
    exclude_tags: result.exclude_tags ?? [],
    max_price: result.max_price ?? null,
    mood_or_craving: result.mood_or_craving ?? null,
  };
}

const norm = (s: string) => s.trim().toLowerCase();
const ALLERGEN_ALIASES: Record<string, string[]> = {
  gluten: ['gluten', 'trigo', 'wheat'],
  lactosa: ['lactosa', 'lactose', 'leche', 'milk', 'lácteos'],
  marisco: ['marisco', 'shellfish', 'crustáceo', 'gamba', 'langosta'],
  pescado: ['pescado', 'fish'],
  'frutos secos': ['frutos secos', 'nuez', 'almendra', 'cacahuete', 'nuts'],
  huevo: ['huevo', 'egg'],
  soja: ['soja', 'soy'],
  sésamo: ['sésamo', 'sesamo', 'sesame'],
  apio: ['apio', 'celery'],
  mostaza: ['mostaza', 'mustard'],
  moluscos: ['molusco', 'mollusk', 'mejillón', 'almeja'],
};

// Pure-code filter — no LLM. An item is eligible only if it passes EVERY hard constraint.
// This is the structural guarantee that makes an allergen/diet violation impossible.
export function filterCandidates(
  items: MenuItemCandidate[],
  constraints: ConstraintExtraction,
): RankedCandidate[] {
  const dietSet = new Set(constraints.dietary_constraints.map(norm));
  const wantVegan = dietSet.has('vegan');
  const wantVegetarian = dietSet.has('vegetarian');
  const wantGlutenFree = dietSet.has('gluten_free');
  const wantSpicy = dietSet.has('spicy');
  const notSpicy = dietSet.has('not_spicy');
  const maxPrice = constraints.max_price;

  const allergens = constraints.exclude_allergens.map(norm);
  // Expand aliases so "leche" matches allergens stored as "lactosa" and vice-versa.
  const expandedAllergens = new Set<string>();
  for (const a of allergens) {
    expandedAllergens.add(a);
    for (const [canonical, aliases] of Object.entries(ALLERGEN_ALIASES)) {
      if (aliases.includes(a) || a.includes(canonical)) {
        aliases.forEach((x) => expandedAllergens.add(x));
      }
    }
  }
  const tags = constraints.exclude_tags.map(norm);

  const searchableText = (item: MenuItemCandidate) =>
    norm([item.name, item.description ?? '', item.category_name].join(' '));

  return items
    .filter((item) => item.is_active)
    .filter((item) => {
      if (wantVegan && !item.is_vegan) return false;
      if (wantVegetarian && !item.is_vegetarian) return false;
      if (wantGlutenFree && !item.is_gluten_free) return false;
      if (wantSpicy && !item.is_spicy) return false;
      if (notSpicy && item.is_spicy) return false;
      if (maxPrice !== null && maxPrice !== undefined && item.price !== null && item.price > maxPrice) return false;

      if (expandedAllergens.size > 0) {
        const itemAllergens = (item.allergens ?? []).map(norm);
        for (const itemAllergen of itemAllergens) {
          if (expandedAllergens.has(itemAllergen)) return false;
          for (const alias of expandedAllergens) {
            if (itemAllergen.includes(alias) || alias.includes(itemAllergen)) return false;
          }
        }
      }

      if (tags.length > 0) {
        const text = searchableText(item);
        for (const tag of tags) {
          if (text.includes(tag)) return false;
        }
      }
      return true;
    })
    .map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      description: item.description,
      category_name: item.category_name,
      is_vegan: item.is_vegan,
      is_vegetarian: item.is_vegetarian,
      is_spicy: item.is_spicy,
      is_gluten_free: item.is_gluten_free,
      allergens: item.allergens ?? [],
    }));
}

export async function rankCandidates(
  provider: LLMProvider,
  input: {
    restaurantName: string;
    currency: string;
    mood_or_craving: string | null;
    candidates: RankedCandidate[];
  },
): Promise<z.infer<typeof RankingOutputSchema>> {
  const { system, messages } = buildRankingPrompt(input);
  return provider.generateStructured({
    system,
    messages,
    schema: RankingOutputSchema,
    temperature: 0.5,
    maxTokens: 700,
  });
}

export interface ValidatedRecommendation {
  item_id: string;
  name: string;
  price: number | null;
  explanation: string;
}

// Server-side safety net: only keep model-referenced item ids that are actually in the
// pre-filtered candidate set (dropping hallucinations), and attach the real item display data.
export function validateRecommendations(
  recommendations: Array<{ item_id: string; explanation: string }>,
  candidates: RankedCandidate[],
): ValidatedRecommendation[] {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const valid: ValidatedRecommendation[] = [];
  for (const rec of recommendations) {
    const item = byId.get(rec.item_id);
    if (!item) continue; // hallucinated id — drop
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    valid.push({
      item_id: item.id,
      name: item.name,
      price: item.price,
      explanation: rec.explanation,
    });
  }
  return valid;
}
