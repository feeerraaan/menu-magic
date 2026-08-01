// Edge-Function-only. Never imported by the Vite frontend — see /docs/AI_ARCHITECTURE.md §1.

export type ProviderId = 'opencode-zen'; // extend later: 'openai' | 'anthropic' | 'gemini' | ...

export type AiFeatureKey =
  | 'description_generator'
  | 'translation'
  | 'menu_optimizer'
  | 'menu_import';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompleteOptions {
  messages: LLMMessage[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CompleteResult {
  text: string;
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
