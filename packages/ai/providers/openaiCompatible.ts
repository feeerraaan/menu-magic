// Generic client for any OpenAI-chat-completions-shaped endpoint. OpenCode Zen wraps this
// today (see opencodeZen.ts); a future OpenAI/OpenRouter provider would wrap it too, since
// both expose the same /chat/completions surface. Edge-Function-only.

import type {
  CompleteOptions,
  CompleteResult,
  GenerateStructuredOptions,
  LLMMessage,
  LLMProvider,
  LLMToolCall,
  ProviderId,
} from './types.ts';

export interface OpenAiCompatibleConfig {
  id: ProviderId;
  baseUrl: string; // e.g. https://opencode.ai/zen/v1 — no trailing slash
  apiKeys: string[]; // rotated on 429 / rate-limit / insufficient-balance responses
  model: string;
  extraHeaders?: Record<string, string>;
}

// Serializes internal LLMMessage objects into the OpenAI wire format. The provider contract
// (types.ts) uses a compact shape for tool calls ({id,name,arguments}); the wire format
// requires the nested `type: 'function'` + `function: {...}` wrapper, and DeepSeek (the
// current Zen backend) rejects messages missing it with "missing field `type`".
function toWireMessages(opts: CompleteOptions): Record<string, unknown>[] {
  const messages: LLMMessage[] = opts.messages;
  const all: LLMMessage[] = opts.system
    ? [{ role: 'system', content: opts.system }, ...messages]
    : messages;
  return all.map((m): Record<string, unknown> => {
    if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
      return {
        role: 'assistant',
        content: m.content ?? null,
        tool_calls: m.tool_calls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: tc.arguments },
        })),
      };
    }
    if (m.role === 'tool') {
      return { role: 'tool', tool_call_id: m.tool_call_id, name: m.name, content: m.content ?? '' };
    }
    return { role: m.role, content: m.content ?? '' };
  });
}

interface ChatCompletionsResponse {
  choices?: Array<{ message?: { content?: string; tool_calls?: WireToolCall[] } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

function toUsage(usage: ChatCompletionsResponse['usage']): { inputTokens: number; outputTokens: number } | undefined {
  if (!usage) return undefined;
  return {
    inputTokens: usage.prompt_tokens ?? 0,
    outputTokens: usage.completion_tokens ?? 0,
  };
}

interface WireToolCall {
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
}

function toToolCalls(wire: WireToolCall[] | undefined): LLMToolCall[] | undefined {
  if (!wire || wire.length === 0) return undefined;
  return wire
    .filter((tc) => tc.function?.name)
    .map((tc) => ({
      id: tc.id ?? `call_${Math.random().toString(36).slice(2)}`,
      name: tc.function!.name!,
      arguments: tc.function!.arguments ?? '{}',
    }));
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
        ...(opts.tools ? { tools: opts.tools, tool_choice: 'auto' } : {}),
        ...(opts.disableThinking ? { thinking: { type: 'disabled' } } : {}),
      });
      const message = json.choices?.[0]?.message;
      const text = message?.content ?? '';
      return {
        text,
        toolCalls: toToolCalls(message?.tool_calls),
        usage: toUsage(json.usage),
      };
    },

    async generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<T> {
      // The free OpenCode Zen models are flaky in two ways (both seen live):
      //   1. Occasionally return an empty body (~1 in 3 on some features).
      //   2. Occasionally wrap the JSON in markdown fences or add prose around it, which a
      //      naive JSON.parse rejects even though the payload is extractable.
      // So: extract the first balanced {...} from the raw text (tolerating fences/prose), and
      // retry the whole request a few times before giving up.
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const json = await callChatCompletions(config, {
            model: config.model,
            messages: toWireMessages(opts),
            temperature: opts.temperature ?? 0.3,
            max_tokens: opts.maxTokens ?? 1024,
            response_format: { type: 'json_object' },
          });
          const raw = json.choices?.[0]?.message?.content ?? '';
          const extracted = extractJsonObject(raw);
          let parsed: unknown;
          try {
            parsed = JSON.parse(extracted);
          } catch {
            throw new Error(`Provider ${config.id}: model did not return valid JSON — got: ${raw.slice(0, 200)}`);
          }
          return opts.schema.parse(parsed);
        } catch (err) {
          lastError = err;
          // Schema validation failures won't fix themselves on retry, but an empty body or a
          // fence-wrapped payload might — retry regardless.
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      throw lastError instanceof Error ? lastError : new Error(`Provider ${config.id}: structured generation failed`);
    },
  };
}

// Returns the text between the first '{' and its matching '}' so prose/fence-wrapped JSON
// (e.g. ```json {...}```) still parses. Falls back to the raw string when unbalanced.
function extractJsonObject(raw: string): string {
  if (!raw) return '{}';
  const start = raw.indexOf('{');
  if (start === -1) return raw.trim();
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return raw.trim();
}
