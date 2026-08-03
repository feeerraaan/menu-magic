// OpenCode Zen: an OpenAI-compatible gateway (https://opencode.ai/zen) exposing a rotating
// roster of free and paid models through the same /chat/completions surface. Chosen as the
// sole provider for this build — see /docs/AI_ARCHITECTURE.md §2 for why, and the multi-key
// rotation rationale (the user runs several OpenCode accounts, each with its own free-tier
// allowance).

import { createOpenAiCompatibleProvider } from './openaiCompatible.ts';
import type { GenerateStructuredOptions, LLMProvider } from './types.ts';

const OPENCODE_ZEN_BASE_URL = 'https://opencode.ai/zen/v1';

// Free-tier default. OpenCode Zen's free roster rotates over time (promotional), so this is
// only a fallback — always overridable per-feature via AI_MODEL_<FEATURE> env vars, see
// registry.ts.
const DEFAULT_MODEL = 'deepseek-v4-flash-free';

export function createOpenCodeZenProvider(
  apiKeys: string[],
  opts?: {
    model?: string;
    fallbackModels?: string[];
    requestTimeoutMs?: number;
    fallbackRequestTimeoutMs?: number;
  },
): LLMProvider {
  const keys = apiKeys.map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    throw new Error(
      'OpenCode Zen provider requires at least one API key. Set the OPENCODE_ZEN_API_KEYS secret ' +
        '(comma-separated if using more than one OpenCode account for rate-limit fallback).',
    );
  }

  const models = [...new Set([opts?.model ?? DEFAULT_MODEL, ...(opts?.fallbackModels ?? [])].filter(Boolean))];
  const providers = models.map((model, index) =>
    createOpenAiCompatibleProvider({
      id: 'opencode-zen',
      baseUrl: OPENCODE_ZEN_BASE_URL,
      apiKeys: keys,
      model,
      requestTimeoutMs: index === 0 ? opts?.requestTimeoutMs : opts?.fallbackRequestTimeoutMs,
      // The current DFLASH-backed Zen models reject grammar-constrained decoding. The
      // structured-output prompt plus local JSON extraction/schema validation remains active.
      supportsJsonObjectResponseFormat: false,
      // The provider's DeepSeek backend can spend the entire output budget on reasoning, while
      // structured menu extraction only needs the JSON payload and does not echo reasoning.
      disableThinkingForStructured: true,
    }),
  );

  async function withModelFallback<T>(operation: (provider: LLMProvider) => Promise<T>): Promise<T> {
    const failures: string[] = [];
    for (let i = 0; i < providers.length; i++) {
      try {
        return await operation(providers[i]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${models[i]}: ${message}`);
        if (i + 1 < providers.length) {
          console.warn(`[opencode-zen] model ${models[i]} failed; trying ${models[i + 1]}: ${message}`);
        }
      }
    }
    throw new Error(`Provider opencode-zen failed on all configured models: ${failures.join(' | ')}`);
  }

  return {
    id: 'opencode-zen',
    complete: (options) => withModelFallback((provider) => provider.complete(options)),
    generateStructured: <T>(options: GenerateStructuredOptions<T>) =>
      withModelFallback((provider) => provider.generateStructured(options)),
  };
}
