// Orchestration: binds a provider + the translation prompt to one job. Edge-Function-only.
// Also reused from packages/ai/pipelines/importPipeline.ts (Phase 4) to auto-translate
// imported content into every supported_languages entry — one agent, two callers.

import { z } from 'https://esm.sh/zod@3.25.76';
import type { LLMProvider } from '../providers/types.ts';
import { buildTranslationPrompt } from '../prompts/translation.ts';

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
