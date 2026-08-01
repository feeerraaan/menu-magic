// Pure template function — no I/O. Edge-Function-only.
// Business Insights (Phase 7): turns already-computed metrics (views, menu stats, score
// history) into consultant-style narrative + discrete, dismissible recommendations. The LLM
// explains numbers the pipeline already worked out; it never recomputes or invents them.

import type { LLMMessage } from '../providers/types.ts';

export interface InsightsPromptInput {
  restaurantName: string;
  currency: string;
  metrics: Record<string, unknown>;
}

const RESPONSE_SHAPE = [
  '{"narrative": string, "recommendations": [',
  '{"category": string, "target_type": "item"|"category"|"menu"|"restaurant"|null,',
  ' "target_id": string|null, "title": string, "detail": string}',
  ']}',
].join(' ');

export function buildInsightsPrompt(input: InsightsPromptInput): { system: string; messages: LLMMessage[] } {
  const system = [
    'Eres un consultor experto en restaurantes.',
    'Recibes MÉTRICAS YA CALCULADAS (no las inventes ni las recalcules) de un restaurante real: vistas del menú, estadísticas de platos, historial de puntuación del optimizador.',
    'Escribe un análisis narrativo breve (3-6 frases) en español con tono de consultor: qué funciona, qué flojea, qué hacer.',
    'Luego genera recomendaciones CONCRETAS y accionables (máximo 5) como tarjetas individuales, cada una con:',
    '- "category": una etiqueta corta, p.ej. "fotos", "precios", "idiomas", "balance", "platos", "vistas".',
    '- "target_type"/"target_id": el elemento al que apunta si aplica (item/category/menu/restaurant); target_id debe ser el id real que aparece en las métricas, o null si es global.',
    '- "title": título corto de la tarjeta.',
    '- "detail": una frase de detalle accionable.',
    'No repitas recomendaciones del mismo tipo. Sé honesto: si algo va mal, dilo.',
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
