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
  requestTimeoutMs?: number;
  maxRequestDurationMs?: number;
  supportsJsonObjectResponseFormat?: boolean;
  disableThinkingForStructured?: boolean;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;

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
  const timeoutMs = config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

  for (let i = 0; i < config.apiKeys.length; i++) {
    const key = config.apiKeys[i];
    const controller = new AbortController();
    let timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const hardTimeoutId = body.stream === true && config.maxRequestDurationMs
      ? setTimeout(() => controller.abort(), config.maxRequestDurationMs)
      : undefined;
    try {
      const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          ...config.extraHeaders,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
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

      if (body.stream === true) {
        // Streaming uses an inactivity timeout rather than a total response timeout. A large
        // menu may take longer than 40 seconds overall, but should remain alive as long as Zen
        // keeps sending chunks. If the provider never sends the first chunk, or goes silent,
        // the same bounded timeout still triggers the model fallback.
        const resetInactivityTimeout = () => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        };
        resetInactivityTimeout();
        return await readStreamingChatCompletions(res, resetInactivityTimeout);
      }

      return await res.json();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Provider ${config.id} request timed out after ${timeoutMs}ms`);
      }
      lastError = err instanceof Error ? err : new Error(String(err));
    } finally {
      clearTimeout(timeoutId);
      if (hardTimeoutId) clearTimeout(hardTimeoutId);
    }
  }

  throw lastError ?? new Error(`Provider ${config.id}: no API keys configured`);
}

async function readStreamingChatCompletions(
  response: Response,
  resetInactivityTimeout: () => void,
): Promise<ChatCompletionsResponse> {
  if (!response.body) throw new Error('Provider returned an empty streaming response');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let rawBody = '';
  let sawSseData = false;
  let content = '';
  let usage: ChatCompletionsResponse['usage'];

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('data:')) {
      rawBody += trimmed;
      return;
    }
    const data = trimmed.slice(5).trim();
    if (!data || data === '[DONE]') return;
    sawSseData = true;
    const event = JSON.parse(data) as {
      choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
      usage?: ChatCompletionsResponse['usage'];
    };
    const choice = event.choices?.[0];
    content += choice?.delta?.content ?? choice?.message?.content ?? '';
    usage = event.usage ?? usage;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    resetInactivityTimeout();
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) processLine(line);
  }
  buffer += decoder.decode();
  if (buffer) processLine(buffer);

  if (!sawSseData) {
    const parsed = JSON.parse(rawBody) as ChatCompletionsResponse;
    return parsed;
  }
  return { choices: [{ message: { content } }], usage };
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
      // The free OpenCode Zen models are flaky in three ways (all seen live):
      //   1. Occasionally return an empty body (~1 in 3 on some features).
      //   2. Occasionally wrap the JSON in markdown fences or add prose around it, which a
      //      naive JSON.parse rejects even though the payload is extractable.
      //   3. Occasionally TRUNCATE the JSON mid-string because the response hit max_tokens
      //      (seen on long menu imports) — the payload is still salvageable.
      // So: extract the first balanced {...}, then if JSON.parse fails try to repair the
      // truncated output by closing any dangling string/bracket; retry the whole request a
      // few times before giving up.
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const requestBody: Record<string, unknown> = {
            model: config.model,
            messages: toWireMessages(opts),
            temperature: opts.temperature ?? 0.3,
            max_tokens: opts.maxTokens ?? 1024,
            stream: true,
            ...(config.disableThinkingForStructured ? { thinking: { type: 'disabled' } } : {}),
            ...(config.supportsJsonObjectResponseFormat === false
              ? {}
              : { response_format: { type: 'json_object' } }),
          };

          let json: ChatCompletionsResponse;
          try {
            json = await callChatCompletions(config, requestBody);
          } catch (err) {
            // OpenCode Zen's DFLASH models currently reject grammar-constrained decoding,
            // which is what response_format=json_object enables upstream. Retry the same
            // request without that optional hint; the prompts already require JSON and the
            // local parser + schema validation still enforce the response contract.
            if (!isGrammarConstrainedDecodingUnsupported(err)) throw err;
            delete requestBody.response_format;
            json = await callChatCompletions(config, requestBody);
          }

          const raw = json.choices?.[0]?.message?.content ?? '';
          const parsed: unknown = tryParseJson(raw, opts.rejectTruncatedJson !== true);
          if (parsed === undefined) {
            throw new Error(`Provider ${config.id}: model did not return valid JSON — got: ${raw.slice(0, 200)}`);
          }
          return opts.schema.parse(parsed);
        } catch (err) {
          if (isProviderTimeout(err) || isProviderRequestFailure(err)) throw err;
          lastError = err;
          // An empty body, a fence-wrapped payload, or a transient schema mismatch might fix
          // themselves on retry. Transport/provider failures are surfaced immediately so the
          // OpenCode Zen model fallback can take over without wasting two more attempts.
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      throw lastError instanceof Error ? lastError : new Error(`Provider ${config.id}: structured generation failed`);
    },
  };
}

function isGrammarConstrainedDecodingUnsupported(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /speculative decoding does not support grammar-constrained decoding/i.test(message);
}

function isProviderTimeout(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /request timed out after \d+ms/i.test(message);
}

function isProviderRequestFailure(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /^Provider [\w-]+ (?:error \d{3}:|rejected key)/i.test(message);
}

// Parses JSON leniently: extracts the first balanced {...}, then falls back to repairing a
// truncated payload (closes dangling string/brackets) before giving up. Returns undefined on
// genuine failure.
function tryParseJson(raw: string, allowRepair = true): unknown | undefined {
  if (!raw) return undefined;
  const balanced = extractJsonObject(raw);
  try {
    return JSON.parse(balanced);
  } catch {
    // balanced === raw.trim() means the object was unclosed — try a repair pass.
  }
  if (!allowRepair) return undefined;
  try {
    return JSON.parse(repairTruncatedJson(balanced));
  } catch {
    return undefined;
  }
}

// Returns the text between the first '{' and its matching '}' so prose/fence-wrapped JSON
// (e.g. ```json {...}```) still parses. When unbalanced (truncated), returns everything from
// the first '{' to the end of the string so the caller can attempt repair.
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
  return raw.slice(start); // truncated — keep everything from the first '{' for repair
}

// Best-effort repair for a JSON object that was cut off mid-string or mid-array: closes any
// dangling string quote, strips a trailing comma, and closes open braces/brackets. Never
// throws — returns the repaired text even if it's still invalid.
function repairTruncatedJson(raw: string): string {
  const stack: string[] = [];
  let out = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === '{') {
      stack.push('}');
      out += ch;
      continue;
    }
    if (ch === '[') {
      stack.push(']');
      out += ch;
      continue;
    }
    if (ch === '}' || ch === ']') {
      const expect = ch === '}' ? '}' : ']';
      if (stack.length > 0 && stack[stack.length - 1] === expect) stack.pop();
      out += ch;
      continue;
    }
    out += ch;
  }

  if (inString) out += '"'; // close a dangling string

  // Strip a trailing comma left by the cut (e.g. `"items": [...],`).
  out = out.replace(/,\s*$/, '');

  // Close any remaining open brackets in reverse order.
  while (stack.length > 0) out += stack.pop();

  return out;
}
