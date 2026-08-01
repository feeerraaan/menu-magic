// Orchestration: binds a provider + the insights prompt to one job. Edge-Function-only.
// Takes an already-built metrics snapshot — no DB access here (that's
// pipelines/insightsPipeline.ts's job).

import { z } from 'https://esm.sh/zod@3.25.76';
import type { LLMProvider } from '../providers/types.ts';
import { buildInsightsPrompt, type InsightsPromptInput } from '../prompts/insights.ts';

const RecommendationSchema = z.object({
  category: z.string().min(1).max(40),
  target_type: z.enum(['item', 'category', 'menu', 'restaurant']).nullable().optional(),
  target_id: z.string().nullable().optional(),
  title: z.string().min(1).max(120),
  detail: z.string().max(300),
});

const InsightsOutputSchema = z.object({
  narrative: z.string().min(1).max(3000),
  recommendations: z.array(RecommendationSchema).max(5),
});

export type InsightsOutput = z.infer<typeof InsightsOutputSchema>;

export async function generateInsights(
  provider: LLMProvider,
  input: InsightsPromptInput,
): Promise<InsightsOutput> {
  const { system, messages } = buildInsightsPrompt(input);
  return provider.generateStructured({
    system,
    messages,
    schema: InsightsOutputSchema,
    temperature: 0.5,
    maxTokens: 1500,
  });
}
