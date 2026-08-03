// Orchestration: binds a provider + the translation prompt to one job. Edge-Function-only.
// Also reused from packages/ai/pipelines/importPipeline.ts (Phase 4) to auto-translate
// imported content into every supported_languages entry — one agent, two callers.

import { z } from 'https://esm.sh/zod@3.25.76';
import type { LLMProvider } from '../providers/types.ts';
import {
  buildTranslationPrompt,
  buildMenuBatchTranslationPrompt,
  type MenuBatchTranslationInput,
} from '../prompts/translation.ts';

const TranslationOutputSchema = z.object({
  translatedText: z.string().min(1).max(1000),
});

export async function translateText(
  provider: LLMProvider,
  text: string,
  sourceLocale: string,
  targetLocale: string,
  context?: string,
): Promise<{ translatedText: string }> {
  const { system, messages } = buildTranslationPrompt(text, sourceLocale, targetLocale, context);
  return provider.generateStructured({
    system,
    messages,
    schema: TranslationOutputSchema,
    temperature: 0.4,
    maxTokens: 400,
  });
}

const MenuBatchTranslationOutputSchema = z.object({
  menuName: z.string().min(1).max(200),
  categories: z.array(
    z.object({
      name: z.string().min(1).max(200),
      description: z.string().max(500).nullable().optional(),
      items: z.array(
        z.object({
          name: z.string().min(1).max(200),
          description: z.string().max(500).nullable().optional(),
        }),
      ),
    }),
  ),
});

export type MenuBatchTranslationOutput = z.infer<typeof MenuBatchTranslationOutputSchema>;

// Used by packages/ai/pipelines/importPipeline.ts to translate a whole extracted menu tree
// into one target language per call, instead of one call per field.
export async function translateMenuBatch(
  provider: LLMProvider,
  input: MenuBatchTranslationInput,
  sourceLocale: string,
  targetLocale: string,
): Promise<MenuBatchTranslationOutput> {
  const { system, messages } = buildMenuBatchTranslationPrompt(input, sourceLocale, targetLocale);
  return provider.generateStructured({
    system,
    messages,
    schema: MenuBatchTranslationOutputSchema,
    temperature: 0.3,
    maxTokens: 6000,
  });
}
