// OpenCode Zen: an OpenAI-compatible gateway (https://opencode.ai/zen) exposing a rotating
// roster of free and paid models through the same /chat/completions surface. Chosen as the
// sole provider for this build — see /docs/AI_ARCHITECTURE.md §2 for why, and the multi-key
// rotation rationale (the user runs several OpenCode accounts, each with its own free-tier
// allowance).

import { createOpenAiCompatibleProvider } from './openaiCompatible.ts';
import type { LLMProvider } from './types.ts';

const OPENCODE_ZEN_BASE_URL = 'https://opencode.ai/zen/v1';

// Free-tier default. OpenCode Zen's free roster rotates over time (promotional), so this is
// only a fallback — always overridable per-feature via AI_MODEL_<FEATURE> env vars, see
// registry.ts.
const DEFAULT_MODEL = 'deepseek-v4-flash-free';

export function createOpenCodeZenProvider(apiKeys: string[], opts?: { model?: string }): LLMProvider {
  const keys = apiKeys.map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    throw new Error(
      'OpenCode Zen provider requires at least one API key. Set the OPENCODE_ZEN_API_KEYS secret ' +
        '(comma-separated if using more than one OpenCode account for rate-limit fallback).',
    );
  }

  return createOpenAiCompatibleProvider({
    id: 'opencode-zen',
    baseUrl: OPENCODE_ZEN_BASE_URL,
    apiKeys: keys,
    model: opts?.model ?? DEFAULT_MODEL,
  });
}
