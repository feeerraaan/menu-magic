// Edge-Function-only. Never imported by the Vite frontend — see /docs/AI_ARCHITECTURE.md §1.

export type ProviderId = 'opencode-zen'; // extend later: 'openai' | 'anthropic' | 'gemini' | ...

export type AiFeatureKey =
  | 'description_generator'
  | 'translation'
  | 'menu_optimizer'
  | 'menu_import'
  | 'copilot'
  | 'insights'
  | 'customer_assistant';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  // Copilot phase: when role === 'assistant' and the model emitted tool calls.
  tool_calls?: LLMToolCall[];
  // Copilot phase: when role === 'tool' — the id of the tool call this message answers.
  tool_call_id?: string;
  name?: string;
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: string; // JSON-encoded args string, exactly as the provider returned it
}

export interface LLMToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

export interface CompleteOptions {
  messages: LLMMessage[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  // Copilot phase: when present, the request is a function-calling turn. Always 'auto' —
  // 'required' is rejected by OpenCode Zen's DeepSeek thinking-mode (validated live).
  tools?: LLMToolDefinition[];
  // Copilot phase: DeepSeek thinking-mode demands reasoning_content be echoed back on the
  // next turn, which this client doesn't store — so the Copilot loop disables thinking so
  // multi-turn tool loops work (validated live; see docs/IMPLEMENTATION_PLAN.md Phase 6).
  disableThinking?: boolean;
}

export interface CompleteResult {
  text: string;
  toolCalls?: LLMToolCall[];
  usage?: { inputTokens: number; outputTokens: number };
}

// Duck-typed to Zod's ZodType<T> interface (`.parse(data): T`, throws on failure) so a
// real Zod schema satisfies this structurally without providers/types.ts importing Zod.
export interface StructuredSchema<T> {
  parse(data: unknown): T;
}

export interface GenerateStructuredOptions<T> extends CompleteOptions {
  schema: StructuredSchema<T>;
}

export interface LLMProvider {
  id: ProviderId;
  complete(opts: CompleteOptions): Promise<CompleteResult>;
  generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<T>;
}
