// Orchestration: binds a provider + the extraction prompt to one job. Edge-Function-only.
// No I/O here (no file parsing, no DB) — that's pipelines/importPipeline.ts's job; this
// agent only turns already-extracted raw text into structured menu data.

import { z } from 'https://esm.sh/zod@3.25.76';
import type { LLMProvider } from '../providers/types.ts';
import { buildExtractionPrompt } from '../prompts/menuImport.ts';

const MenuImportItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  isVegetarian: z.boolean().optional().default(false),
  isVegan: z.boolean().optional().default(false),
  isSpicy: z.boolean().optional().default(false),
  isGlutenFree: z.boolean().optional().default(false),
  allergens: z.array(z.string()).optional().default([]),
});

const MenuImportCategorySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  items: z.array(MenuImportItemSchema).max(300),
});

const MenuImportOutputSchema = z.object({
  menuName: z.string().min(1).max(200),
  categories: z.array(MenuImportCategorySchema).max(60),
});

export type MenuImportExtraction = z.infer<typeof MenuImportOutputSchema>;

const MAX_EXTRACTION_CHUNK_CHARS = 5_500;
const EXTRACTION_CHUNK_OVERLAP_CHARS = 700;

function splitMenuText(rawText: string): string[] {
  const text = rawText.trim();
  if (text.length <= MAX_EXTRACTION_CHUNK_CHARS) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const targetEnd = Math.min(start + MAX_EXTRACTION_CHUNK_CHARS, text.length);
    let end = targetEnd;
    if (targetEnd < text.length) {
      const lineBreak = text.lastIndexOf('\n', targetEnd);
      if (lineBreak > start + Math.floor(MAX_EXTRACTION_CHUNK_CHARS * 0.55)) end = lineBreak;
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= text.length) break;

    const overlapStart = Math.max(start + 1, end - EXTRACTION_CHUNK_OVERLAP_CHARS);
    const overlapLineBreak = text.lastIndexOf('\n', overlapStart);
    start = overlapLineBreak >= start ? overlapLineBreak + 1 : overlapStart;
  }
  return chunks;
}

function menuKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function mergeExtractions(extractions: MenuImportExtraction[]): MenuImportExtraction {
  const categories: MenuImportExtraction['categories'] = [];
  const categoryIndexes = new Map<string, number>();

  for (const extraction of extractions) {
    for (const category of extraction.categories) {
      const categoryKey = menuKey(category.name);
      let categoryIndex = categoryIndexes.get(categoryKey);
      if (categoryIndex === undefined) {
        categoryIndex = categories.length;
        categoryIndexes.set(categoryKey, categoryIndex);
        categories.push({ ...category, items: [] });
      }

      const targetCategory = categories[categoryIndex];
      if (!targetCategory.description && category.description) targetCategory.description = category.description;
      const itemIndexes = new Map(targetCategory.items.map((item, index) => [menuKey(item.name), index]));

      for (const item of category.items) {
        const itemKey = menuKey(item.name);
        const existingIndex = itemIndexes.get(itemKey);
        if (existingIndex === undefined) {
          itemIndexes.set(itemKey, targetCategory.items.length);
          targetCategory.items.push(item);
          continue;
        }
        const existing = targetCategory.items[existingIndex];
        targetCategory.items[existingIndex] = {
          ...existing,
          description: existing.description || item.description,
          price: existing.price ?? item.price,
          isVegetarian: existing.isVegetarian || item.isVegetarian,
          isVegan: existing.isVegan || item.isVegan,
          isSpicy: existing.isSpicy || item.isSpicy,
          isGlutenFree: existing.isGlutenFree || item.isGlutenFree,
          allergens: existing.allergens?.length ? existing.allergens : item.allergens,
        };
      }
    }
  }

  return {
    menuName: extractions.find((extraction) => extraction.menuName.trim())?.menuName ?? 'Mi menú',
    categories,
  };
}

export async function extractMenuStructure(
  provider: LLMProvider,
  rawText: string,
  locale: string,
): Promise<MenuImportExtraction> {
  const chunks = splitMenuText(rawText);
  console.info(`[menu-import] extracting ${chunks.length} chunk(s) with primary/fallback provider support`);
  const extractions = await Promise.all(
    chunks.map(async (chunk) => {
      const { system, messages } = buildExtractionPrompt(chunk, locale, { fragment: chunks.length > 1 });
      return provider.generateStructured({
        system,
        messages,
        schema: MenuImportOutputSchema,
        temperature: 0.2,
        maxTokens: 4000,
        rejectTruncatedJson: true,
      });
    }),
  );
  return mergeExtractions(extractions);
}
