# SaCarta AI Architecture

Technical reference for the AI layer. Read this before touching any AI-related code in this repo.

## 1. Where `packages/ai/` lives and how two runtimes share it

SaCarta has no backend server of its own — the only server-side compute is Supabase Edge Functions (Deno). The frontend is a Vite/React SPA. These are two incompatible module-resolution worlds (npm/bundled vs. raw Deno `.ts` + `https://esm.sh/...` imports), and no monorepo tool (pnpm/npm workspaces) is introduced to bridge them — that would risk the existing single-package Vercel deploy for no real benefit, since nothing in `packages/ai` needs to be `npm install`ed or compiled.

Instead, `packages/ai/` is **plain, unbundled TypeScript source** at `/root/menu-magic/packages/ai/`, read directly by both runtimes:

- **Deno Edge Functions** import it via **relative path** (`../../../packages/ai/providers/registry.ts`) — Deno executes raw `.ts` natively, exactly like the existing functions already import `https://esm.sh/stripe@18.5.0` with zero build step.
- **The Vite frontend** only ever imports `packages/ai/schemas/*` — pure Zod schemas and inferred types, zero Deno globals, zero network calls — via a `@ai` path alias (`vite.config.ts` + `tsconfig.app.json`).

This is a **hard boundary enforced by directory, not just convention**: an ESLint `no-restricted-imports` rule in `eslint.config.js` blocks `src/**` from importing `packages/ai/{providers,agents,tools,pipelines}/**`. This is the actual mechanism behind "no direct provider calls inside UI components" — a lint failure, not a hope that nobody violates a comment.

```
packages/ai/
  schemas/            # frontend-safe: description.ts, translation.ts, optimizer.ts, menuImport.ts, common.ts
  providers/          # Edge-Function-only — reads Deno.env, calls the LLM over HTTP
    types.ts
    openaiCompatible.ts
    opencodeZen.ts
    registry.ts
  prompts/            # pure template functions — no I/O, no provider awareness
  agents/             # orchestration: binds a provider + prompt (+ later, tools) to a specific job
  pipelines/          # deterministic multi-step workflows (currently: AI Import only)
  tools/              # empty for now — populated when the Copilot (Phase 7) is built
```

## 2. Provider abstraction — OpenCode Zen today, generic for tomorrow

```ts
// packages/ai/providers/types.ts
export type ProviderId = 'opencode-zen'; // extend later: 'openai' | 'anthropic' | 'gemini' | ...
export type AiFeatureKey = 'description_generator' | 'translation' | 'menu_optimizer' | 'menu_import';

export interface LLMMessage { role: 'system' | 'user' | 'assistant'; content: string }
export interface CompleteOptions { messages: LLMMessage[]; system?: string; temperature?: number; maxTokens?: number }
export interface CompleteResult { text: string; usage?: { inputTokens: number; outputTokens: number } }

export interface LLMProvider {
  id: ProviderId;
  complete(opts: CompleteOptions): Promise<CompleteResult>;
  generateStructured<T>(opts: CompleteOptions & { schema: import('zod').ZodType<T> }): Promise<T>;
}
```

**Why OpenCode Zen:** it's an OpenAI-compatible gateway (`https://opencode.ai/zen/v1/chat/completions`, Bearer auth) already used elsewhere in the user's infrastructure, exposing free models (roster rotates; e.g. `deepseek-v4-flash-free`, `mimo-v2.5-free`, `nemotron-3-ultra-free`) alongside paid ones, all through the same OpenAI-compatible surface. Implementing one solid OpenAI-compatible client (`openaiCompatible.ts`) and pointing it at Zen's base URL gets the whole model roster "for free" — no per-model integration work.

`providers/opencodeZen.ts`:
```ts
export function createOpenCodeZenProvider(apiKeys: string[], opts?: { model?: string }): LLMProvider
```
Accepts **multiple API keys** (the user runs several OpenCode accounts, each with its own free-tier allowance) and round-robins across them; on a 429/rate-limit/insufficient-balance response, it retries the same request with the next key before giving up. Keys come from the `OPENCODE_ZEN_API_KEYS` Deno secret (comma-separated).

`providers/registry.ts`:
```ts
export function getProviderForFeature(feature: AiFeatureKey): LLMProvider {
  const keys = (Deno.env.get('OPENCODE_ZEN_API_KEYS') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const model = Deno.env.get(`AI_MODEL_${feature.toUpperCase()}`) ?? Deno.env.get('AI_MODEL_DEFAULT') ?? 'deepseek-v4-flash-free';
  return createOpenCodeZenProvider(keys, { model });
}
```
Switching a feature's model is `supabase secrets set AI_MODEL_TRANSLATION=qwen3.6-plus-free` — no redeploy, picked up on the next invocation. No DB-backed config table; this is a solo-operator product at this stage, and Deno secrets already work exactly this way for Stripe/Resend.

**Function-calling on Zen (VALIDATED 2026-08-01 during Phase 6 build):** the free model (`deepseek-v4-flash-free`) reliably emits `tool_calls` in `tool_choice:'auto'` mode and chains read-only → mutating calls across turns. Two gotchas shaped the Copilot implementation: (1) `tool_choice:'required'` is rejected by the provider (DeepSeek thinking-mode: `"Thinking mode does not support this tool_choice"`) — the Copilot only ever uses `auto`; (2) DeepSeek thinking-mode demands `reasoning_content` be echoed back on the next turn, which the provider contract doesn't store — the Copilot's loop disables thinking (`thinking:{type:'disabled'}`) and multi-turn tool loops work. See `IMPLEMENTATION_PLAN.md` §Phase 6.

## 3. `prompts/` vs `agents/` vs `pipelines/` vs `tools/`

| Folder | Contains | Never contains |
|---|---|---|
| `prompts/` | Pure functions returning strings/message arrays | Any `await`, any provider or Supabase reference |
| `agents/` | Orchestration: binds one provider call + one prompt to one job, returns a typed result | Raw SQL, multi-step sequencing |
| `pipelines/` | Deterministic multi-step workflows invoking multiple agents/non-AI steps in a fixed order | Conversational/tool-choice logic |
| `tools/` | (Phase 7+) Typed function-calling definitions + their executors — the only code allowed to mutate the DB on an agent's behalf | Prompt text, provider selection |

Concretely, for Phases 1-4:
```
prompts/descriptionGenerator.ts   buildDescriptionPrompt(item, style, locale): LLMMessage[]
prompts/translation.ts            buildTranslationPrompt(sourceText, sourceLocale, targetLocale): LLMMessage[]
prompts/optimizer.ts              buildOptimizerPrompt(menuSnapshot): LLMMessage[]
prompts/menuImport.ts             buildExtractionPrompt(rawText): LLMMessage[]

agents/descriptionAgent.ts        generateDescription(item, style, locale): DescriptionOutput
agents/translationAgent.ts        translateText(text, sourceLocale, targetLocale): TranslationOutput
agents/optimizerAgent.ts          scoreMenu(menuSnapshot): OptimizerOutput
agents/menuImportAgent.ts         extractMenuStructure(rawText): MenuImportOutput

pipelines/importPipeline.ts       extractText(file) -> menuImportAgent -> validate -> translationAgent per supported_language -> bulk insert
```
`translationAgent.ts` is called both directly (a "Traducir con IA" button) and from inside `importPipeline.ts` (auto-translating imported content) — one agent, two callers.

## 4. Async jobs (needed starting Phase 3)

Supabase Edge Functions have an execution time budget (roughly ~150s on the platform) and there is no persistent worker/queue in this app. The mechanism:

1. An Edge Function inserts an `ai_jobs` row (`status='queued'`), then either runs the work inline and updates the row before returning (fine for anything well under the time budget — Optimizer, most Import runs), or, for genuinely long work, calls `EdgeRuntime.waitUntil(pipeline(...))` and returns `{ job_id }` immediately, continuing to update the row after the HTTP response is sent.
2. The frontend does **not poll** — it subscribes via Supabase Realtime: `supabase.channel('ai_jobs:' + jobId).on('postgres_changes', {event: 'UPDATE', schema: 'public', table: 'ai_jobs', filter: 'id=eq.' + jobId}, cb)`. This requires `ai_jobs` to be added to the `supabase_realtime` publication (done in the Phase 0 migration).
3. No external worker, no new hosting, no `pg_cron` dependency for MVP — Edge Functions are the only compute and that's sufficient at this scale (a PDF menu is a handful of pages, an import is tens of items).

Optimizer (Phase 3) deliberately goes through this exact mechanism even though it's usually fast enough to finish inline — the goal is to prove the `ai_jobs` + Realtime plumbing on a read-only feature (nothing to corrupt if something's wrong) before Import (Phase 4) has to depend on it for a feature that writes real data.

## 5. UI/hooks contract

```
Component (e.g. ItemDialogWithTranslations.tsx)
  -> src/hooks/useAiDescription.ts       (local useState/useEffect, mirrors useRestaurant.ts's shape)
  -> src/lib/ai-api.ts                   (one function per operation, mirrors src/lib/api.ts)
  -> supabase.functions.invoke('ai-generate-description', { body })
  -> supabase/functions/ai-generate-description/index.ts
       -> packages/ai/agents/descriptionAgent.ts -> packages/ai/providers/registry.ts
```

Components **never** import `packages/ai/{providers,agents,tools,pipelines}` — only `packages/ai/schemas` (for typing), and only ever reach AI logic through `supabase.functions.invoke`, exactly like the existing Stripe/email Edge Function calls in `OnboardingWizard.tsx`/`Billing.tsx`.

**Generated content is always a suggestion the human approves.** Description and Translation Edge Functions never write to `items`/`item_translations`/`category_translations` directly — they return text; the existing dialog's existing Save button persists it, unchanged. Only Import (which creates whole new rows) and job-status/usage-ledger updates are written directly by an Edge Function, and only that Edge Function — never the client.

## 6. Migration/RLS conventions

New tables follow the exact conventions already established in `supabase/migrations/`:
- File naming: `YYYYMMDDHHMMSS_<uuid>.sql`, small, single-purpose, idempotent (`ADD COLUMN IF NOT EXISTS`).
- Owner-scoped RLS: `EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())` — the same join-chain pattern used for `menus`/`categories`/`items`.
- "No direct write, service-role only" tables (`ai_jobs` status transitions, `ai_usage`, `ai_menu_scores`) use explicit `WITH CHECK (false)` policies for authenticated INSERT/UPDATE/DELETE, exactly matching the existing precedent on `subscriptions`.

**Client choice per Edge Function:** default to the **anon key + the caller's forwarded JWT** (like `create-checkout`) so RLS double-enforces ownership even if the function's own check has a bug — this is strictly safer than a blanket service-role client. Use a **second, service-role-scoped client** only for the specific writes RLS explicitly blocks from authenticated users (`ai_jobs` status transitions, `ai_usage` charges, `ai_menu_scores` inserts) — never broaden service-role use beyond that.

## 7. Plan limits and credits

`PlanLimits` previously existed in two places (`src/types/database.ts`'s dead copy and `src/lib/subscription-limits.ts`'s real one, consumed via `useSubscriptionContext()`). This is consolidated as part of Phase 0 — `subscription-limits.ts` is the single source of truth going forward.

AI usage is metered as a **single unified credit pool** (`aiCreditsPerMonth`), not per-feature quotas — LLM cost varies too much per operation type to hand-tune separately, and a single number per plan tier is both simpler to reason about and to communicate to users. See `FEATURE_SPECIFICATIONS.md` for the exact credit costs and per-tier pool sizes.

Enforcement pattern, used by every AI Edge Function before doing paid work:
```sql
select get_ai_credits_used_this_period(:restaurant_id);
-- if used + operation_cost > plan_limit: reject with an upgrade-prompt-shaped error
-- else: perform the operation, then insert into ai_usage
```
