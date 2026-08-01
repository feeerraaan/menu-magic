// Pure template function — no I/O. Edge-Function-only. All metrics passed in are already
// computed deterministically by pipelines/optimizerPipeline.ts — the model scores and
// explains them, it never recomputes or invents them.

import type { LLMMessage } from '../providers/types.ts';

export interface OptimizerPromptInput {
  restaurantName: string;
  currency: string;
  metrics: Record<string, unknown>;
}

const RESPONSE_SHAPE = [
  '{"score": number, "breakdown": {',
  '"balance": {"score": number, "note": string},',
  '"priceDistribution": {"score": number, "note": string},',
  '"descriptionQuality": {"score": number, "note": string},',
  '"imageCoverage": {"score": number, "note": string},',
  '"languageCoverage": {"score": number, "note": string},',
  '"categoryQuality": {"score": number, "note": string},',
  '"menuLength": {"score": number, "note": string},',
  '"duplicates": {"score": number, "note": string}',
  '}, "topRecommendations": string[] (máximo 6)}',
].join(' ');

export function buildOptimizerPrompt(input: OptimizerPromptInput): { system: string; messages: LLMMessage[] } {
  const system = [
    'Eres un consultor experto en menús de restaurantes.',
    'Recibes MÉTRICAS YA CALCULADAS (no las inventes ni las recalcules) sobre un menú real.',
    'Puntúa de 0 a 100 cada una de las 8 dimensiones y da una puntuación global de 0 a 100.',
    'Sé honesto y específico: si una métrica es floja, dilo directamente y da una recomendación concreta y accionable en una frase corta por dimensión (campo "note").',
    'No inventes datos que no estén en las métricas proporcionadas.',
    `Responde EXCLUSIVAMENTE con un objeto JSON válido con esta forma exacta: ${RESPONSE_SHAPE}. Sin texto adicional, sin markdown.`,
  ].join(' ');

  const user = [
    `Restaurante: ${input.restaurantName}`,
    `Moneda: ${input.currency}`,
    'Métricas:',
    JSON.stringify(input.metrics, null, 2),
  ].join('\n');

  return { system, messages: [{ role: 'user', content: user }] };
}
