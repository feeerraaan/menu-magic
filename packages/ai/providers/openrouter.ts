// OpenRouter's OpenAI-compatible API, restricted to models currently published as free.

import { createOpenAiCompatibleProvider } from './openaiCompatible.ts';
import type { GenerateStructuredOptions, LLMProvider } from './types.ts';

const BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'google/gemma-4-26b-a4b-it:free';

export function createOpenRouterProvider(
  apiKeys: string[],
  opts?: {
    model?: string;
    fallbackModels?: string[];
    requestTimeoutMs?: number;
    fallbackRequestTimeoutMs?: number;
    maxRequestDurationMs?: number;
    fallbackMaxRequestDurationMs?: number;
  },
): LLMProvider {
  const keys = apiKeys.map((key) => key.trim()).filter(Boolean);
  if (keys.length === 0) throw new Error('OpenRouter requires an API key.');

  const models = [...new Set([opts?.model ?? DEFAULT_MODEL, ...(opts?.fallbackModels ?? [])])];
  const providers = models.map((model, index) => createOpenAiCompatibleProvider({
    id: 'openrouter',
    baseUrl: BASE_URL,
    apiKeys: keys,
    model,
    extraHeaders: {
      'HTTP-Referer': 'https://sacarta.app',
      'X-OpenRouter-Title': 'SaCarta',
    },
    requestTimeoutMs: index === 0 ? opts?.requestTimeoutMs : opts?.fallbackRequestTimeoutMs,
    maxRequestDurationMs: index === 0 ? opts?.maxRequestDurationMs : opts?.fallbackMaxRequestDurationMs,
    // Keep JSON constrained output off because not every free fallback model supports it.
    // Structured prompts and local schema validation still enforce the expected shape.
    supportsJsonObjectResponseFormat: false,
  }));

  async function withFallback<T>(operation: (provider: LLMProvider) => Promise<T>): Promise<T> {
    const failures: string[] = [];
    for (let i = 0; i < providers.length; i++) {
      try {
        return await operation(providers[i]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${models[i]}: ${message}`);
        if (i + 1 < providers.length) {
          console.warn(`[openrouter] free model ${models[i]} failed; trying ${models[i + 1]}: ${message}`);
        }
      }
    }
    throw new Error(`OpenRouter free models failed: ${failures.join(' | ')}`);
  }

  return {
    id: 'openrouter',
    complete: (options) => withFallback((provider) => provider.complete(options)),
    generateStructured: <T>(options: GenerateStructuredOptions<T>) =>
      withFallback((provider) => provider.generateStructured(options)),
  };
}
