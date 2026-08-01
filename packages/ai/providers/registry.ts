// Feature -> provider/model resolution. The only place an Edge Function should call to get
// an LLMProvider instance — never construct createOpenCodeZenProvider(...) directly outside
// this file, so swapping providers later stays a one-file change.

import { createOpenCodeZenProvider } from './opencodeZen.ts';
import type { AiFeatureKey, LLMProvider } from './types.ts';

function parseKeys(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

// `Deno` is Deno's ambient global (provided by the Edge Function runtime) — not declared or
// imported here. This file is never typechecked by the frontend's tsconfig (only
// packages/ai/schemas/* is aliased into Vite — see /docs/AI_ARCHITECTURE.md §1).

export function getProviderForFeature(feature: AiFeatureKey): LLMProvider {
  const keys = parseKeys(Deno.env.get('OPENCODE_ZEN_API_KEYS'));
  const model = Deno.env.get(`AI_MODEL_${feature.toUpperCase()}`) ?? Deno.env.get('AI_MODEL_DEFAULT');
  return createOpenCodeZenProvider(keys, { model });
}
