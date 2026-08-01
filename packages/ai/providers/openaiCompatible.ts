// Generic client for any OpenAI-chat-completions-shaped endpoint. OpenCode Zen wraps this
// today (see opencodeZen.ts); a future OpenAI/OpenRouter provider would wrap it too, since
// both expose the same /chat/completions surface. Edge-Function-only.

import type {
  CompleteOptions,
  CompleteResult,
  GenerateStructuredOptions,
  LLMMessage,
  LLMProvider,
  ProviderId,
} from './types.ts';

export interface OpenAiCompatibleConfig {
  id: ProviderId;
  baseUrl: string; // e.g. https://opencode.ai/zen/v1 — no trailing slash
  apiKeys: string[]; // rotated on 429 / rate-limit / insufficient-balance responses
  model: string;
  extraHeaders?: Record<string, string>;
}

function toWireMessages(opts: CompleteOptions): LLMMessage[] {
  return opts.system ? [{ role: 'system', content: opts.system }, ...opts.messages] : opts.messages;
}

interface ChatCompletionsResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

async function callChatCompletions(
  config: OpenAiCompatibleConfig,
  body: Record<string, unknown>,
): Promise<ChatCompletionsResponse> {
  let lastError: Error | null = null;

  for (let i = 0; i < config.apiKeys.length; i++) {
    const key = config.apiKeys[i];
    try {
      const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          ...config.extraHeaders,
        },
        body: JSON.stringify(body),
      });

      // Rate-limited or out of balance on this key — try the next one before failing.
      if (res.status === 429 || res.status === 402) {
        lastError = new Error(
          `Provider ${config.id} rejected key #${i + 1}/${config.apiKeys.length} (status ${res.status})`,
        );
        continue;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Provider ${config.id} error ${res.status}: ${text}`);
      }

      return await res.json();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error(`Provider ${config.id}: no API keys configured`);
}

export function createOpenAiCompatibleProvider(config: OpenAiCompatibleConfig): LLMProvider {
  if (config.apiKeys.length === 0) {
    throw new Error(`Provider ${config.id} requires at least one API key`);
  }

  return {
    id: config.id,

    async complete(opts: CompleteOptions): Promise<CompleteResult> {
      const json = await callChatCompletions(config, {
        model: config.model,
        messages: toWireMessages(opts),
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 1024,
      });
      const text = json.choices?.[0]?.message?.content ?? '';
      return {
        text,
        usage: json.usage
          ? { inputTokens: json.usage.prompt_tokens, outputTokens: json.usage.completion_tokens }
          : undefined,
      };
    },

    async generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<T> {
      const json = await callChatCompletions(config, {
        model: config.model,
        messages: toWireMessages(opts),
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 1024,
        response_format: { type: 'json_object' },
      });
      const raw = json.choices?.[0]?.message?.content ?? '{}';
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error(`Provider ${config.id}: model did not return valid JSON — got: ${raw.slice(0, 200)}`);
      }
      return opts.schema.parse(parsed);
    },
  };
}
