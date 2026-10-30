// Feature -> provider/model resolution. The only place an Edge Function should call to get
// an LLMProvider instance — never construct createOpenCodeZenProvider(...) directly outside
// this file, so swapping providers later stays a one-file change.

import { createOpenRouterProvider } from './openrouter.ts';
import type { AiFeatureKey, LLMProvider } from './types.ts';

function parseKeys(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

// Ordered free models verified against OpenRouter's live catalog on 2026-10-30.
const FREE_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3.5-super-vl:free',
  'nvidia/nemotron-3.5-lightning:free',
  'recursive/flint-v1.0:free',
  'poolside/laguna-s-2.1:free',
  'openrouter/free',
];

// `Deno` is Deno's ambient global (provided by the Edge Function runtime) — not declared or
// imported here. This file is never typechecked by the frontend's tsconfig (only
// packages/ai/schemas/* is aliased into Vite — see /docs/AI_ARCHITECTURE.md §1).

export function getProviderForFeature(feature: AiFeatureKey): LLMProvider {
  const keys = parseKeys(Deno.env.get('OPENROUTER_API_KEY'));
  const configuredModel = Deno.env.get(`AI_MODEL_${feature.toUpperCase()}`) ?? Deno.env.get('AI_MODEL_DEFAULT');
  const model = configuredModel && FREE_MODELS.includes(configuredModel) ? configuredModel : FREE_MODELS[0];
  const fallbackModels = FREE_MODELS.filter((candidate) => candidate !== model);
  // Streaming gets an inactivity timeout plus a hard per-block cap. This lets active model
  // output run past 30s without allowing two chunks + fallback to hit Supabase's CPU/wall limit.
  const requestTimeoutMs = feature === 'menu_import' ? 30_000 : undefined;
  const fallbackRequestTimeoutMs = feature === 'menu_import' ? 20_000 : undefined;
  const maxRequestDurationMs = feature === 'menu_import' ? 40_000 : undefined;
  const fallbackMaxRequestDurationMs = feature === 'menu_import' ? 30_000 : undefined;
  return createOpenRouterProvider(keys, {
    model,
    fallbackModels,
    requestTimeoutMs,
    fallbackRequestTimeoutMs,
    maxRequestDurationMs,
    fallbackMaxRequestDurationMs,
  });
}
