// Orchestration: binds a provider + the description prompt to one job. Edge-Function-only.

import { z } from 'https://esm.sh/zod@3.25.76';
import type { LLMProvider } from '../providers/types.ts';
import { buildDescriptionPrompt, type DescriptionPromptItem } from '../prompts/descriptionGenerator.ts';
import type { DescriptionStyle } from '../schemas/description.ts';

const DescriptionOutputSchema = z.object({
  description: z.string().min(1).max(500),
});

export async function generateDescription(
  provider: LLMProvider,
  item: DescriptionPromptItem,
  style: DescriptionStyle,
  locale: string,
): Promise<{ description: string }> {
  const { system, messages } = buildDescriptionPrompt(item, style, locale);
  return provider.generateStructured({
    system,
    messages,
    schema: DescriptionOutputSchema,
    temperature: 0.6,
    maxTokens: 300,
  });
}
