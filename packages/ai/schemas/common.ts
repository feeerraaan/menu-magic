// Frontend-safe. Plain TypeScript types only — no runtime imports, no Zod, no Deno globals.
// Consumed by the Vite frontend via the `@ai` alias (see /docs/AI_ARCHITECTURE.md §1) purely
// for typing hook return values; the frontend never imports packages/ai/{providers,agents,
// tools,pipelines}.

export type AiUsageKind = 'description' | 'translation' | 'optimizer_run' | 'import';

export type AiJobType = 'menu_optimizer_run' | 'menu_import' | 'ai_setup';

export type AiJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'canceled';

export interface AiJob {
  id: string;
  restaurant_id: string;
  job_type: AiJobType;
  status: AiJobStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  progress: number;
  ai_credits_charged: number;
  created_at: string;
  updated_at: string;
}
