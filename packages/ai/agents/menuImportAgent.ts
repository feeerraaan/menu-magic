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

export async function extractMenuStructure(
  provider: LLMProvider,
  rawText: string,
  locale: string,
): Promise<MenuImportExtraction> {
  const { system, messages } = buildExtractionPrompt(rawText, locale);
  return provider.generateStructured({
    system,
    messages,
    schema: MenuImportOutputSchema,
    temperature: 0.2,
    maxTokens: 8000,
  });
}
