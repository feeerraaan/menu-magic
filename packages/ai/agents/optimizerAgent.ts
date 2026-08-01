// Orchestration: binds a provider + the optimizer prompt to one job. Edge-Function-only.
// Takes an already-built metrics snapshot — no DB access here (that's
// pipelines/optimizerPipeline.ts's job).

import { z } from 'https://esm.sh/zod@3.25.76';
import type { LLMProvider } from '../providers/types.ts';
import { buildOptimizerPrompt, type OptimizerPromptInput } from '../prompts/optimizer.ts';

const DimensionSchema = z.object({
  score: z.number().int().min(0).max(100),
  note: z.string().min(1).max(300),
});

const OptimizerOutputSchema = z.object({
  score: z.number().int().min(0).max(100),
  breakdown: z.object({
    balance: DimensionSchema,
    priceDistribution: DimensionSchema,
    descriptionQuality: DimensionSchema,
    imageCoverage: DimensionSchema,
    languageCoverage: DimensionSchema,
    categoryQuality: DimensionSchema,
    menuLength: DimensionSchema,
    duplicates: DimensionSchema,
  }),
  topRecommendations: z.array(z.string().min(1).max(300)).max(6),
});

export type OptimizerOutput = z.infer<typeof OptimizerOutputSchema>;

export async function scoreMenu(provider: LLMProvider, input: OptimizerPromptInput): Promise<OptimizerOutput> {
  const { system, messages } = buildOptimizerPrompt(input);
  return provider.generateStructured({
    system,
    messages,
    schema: OptimizerOutputSchema,
    temperature: 0.4,
    maxTokens: 1200,
  });
}
