# SaCarta AI Implementation Plan — build checklist

Living document — update the checkboxes as each phase ships, per the project rule "after each completed feature, update documentation, commit cleanly, continue." See `AI_ARCHITECTURE.md` for the technical design and `FEATURE_SPECIFICATIONS.md` for per-feature specs.

## Phase 0 — Foundations

- [x] Migration: `ai_jobs`, `ai_usage` (+ `get_ai_credits_used_this_period`), `ai_menu_scores`, `ai_generated_content`, provenance columns (`generated_by` on translations, `description_generated_by` on items), `ai_jobs` added to `supabase_realtime` publication. (written, not yet applied to the live Supabase project — see Deployment checklist)
- [x] `PlanLimits` de-duplication: `src/lib/subscription-limits.ts` is the single source of truth; `src/types/database.ts`'s dead copy removed (nothing imported it).
- [x] `aiCreditsPerMonth` added to `PlanLimits` + `PLAN_LIMITS`; `AI_CREDIT_COSTS` constant added.
- [x] `packages/ai/{schemas,providers,agents,prompts,tools,pipelines}/` created; `providers/types.ts`, `providers/openaiCompatible.ts`, `providers/opencodeZen.ts`, `providers/registry.ts`, `schemas/common.ts` written.
- [x] `vite.config.ts` / `tsconfig.app.json`: `@ai` alias to `packages/ai/schemas`.
- [x] `eslint.config.js`: import-boundary rule blocking `src/**` from `packages/ai/{providers,agents,tools,pipelines}/**` (smoke-tested, confirmed it fires).
- [x] `supabase/config.toml`: entries added per function as each is created; `project_id` repointed from the old Lovable project (`sipxerzltoczbhrybwnn`) to the independent project (`dtmnomjbfziwfwheqcfx`) now that infra migration is complete.
- [x] `supabase/functions/_shared/{cors,aiAuth,aiCredits}.ts` — shared JWT/RLS-client/credit-metering helpers reused by every AI Edge Function.
- [x] Migration applied to the live `dtmnomjbfziwfwheqcfx` project (2026-08-01): the 9 pre-existing base migrations were already reflected in that database's schema but untracked in its migration history table (repaired via `supabase migration repair --status applied`), then the Phase 0 AI migration was pushed cleanly via `supabase db push --linked`. `src/integrations/supabase/types.ts` regenerated from the live schema; the `untypedSupabase` cast workaround in `ai-api.ts` has been removed now that `ai_jobs`/`ai_menu_scores`/etc. are in the generated types.

## Phase 1 — AI Description Generator ✅ done

- [x] `packages/ai/schemas/description.ts`, `prompts/descriptionGenerator.ts`, `agents/descriptionAgent.ts`.
- [x] Edge Function `supabase/functions/ai-generate-description/index.ts`.
- [x] `src/lib/ai-api.ts` (new), `src/hooks/useAiDescription.ts` (new).
- [x] UI: "Generar con IA" button + style selector in `ItemDialogWithTranslations.tsx`.
- [x] Manual E2E test against the deployed function (2026-08-01, live `dtmnomjbfziwfwheqcfx` project, real OpenCode Zen call): created a throwaway auth user + restaurant/menu/category/item via the service-role client, signed in for a real JWT, called `ai-generate-description` — got a real generated description, `ai_usage` charged 1 credit, then cleaned up the throwaway data. See the flakiness note below.

## Phase 2 — AI Translation ✅ done

- [x] `packages/ai/schemas/translation.ts`, `prompts/translation.ts`, `agents/translationAgent.ts`.
- [x] Edge Function `supabase/functions/ai-translate/index.ts`.
- [x] `src/hooks/useAiTranslation.ts`.
- [x] UI: "Traducir con IA" button per language tab in `ItemDialogWithTranslations.tsx` and `CategoryDialogWithTranslations.tsx` (added `restaurantId` prop to the latter, wired from `MenuEditor.tsx`).
- [x] Manual E2E test against the deployed function (2026-08-01): live call translated "Arroz meloso con bogavante y alioli casero." es→en correctly.

## Phase 3 — AI Menu Optimizer ✅ done

- [x] `packages/ai/schemas/optimizer.ts`, `prompts/optimizer.ts`, `agents/optimizerAgent.ts`, `pipelines/optimizerPipeline.ts` (deterministic metrics extraction — first use of the pipelines/ folder).
- [x] Edge Function `supabase/functions/ai-optimize-menu/index.ts` (creates an `ai_jobs` row, runs inline, writes `ai_menu_scores` + job output — first feature to exercise the async-job table).
- [x] `src/pages/dashboard/AiOptimizer.tsx` + nav entry in `DashboardSidebar.tsx`.
- [x] `src/hooks/useAiOptimizer.ts` (Realtime subscription to `ai_jobs`, plus score-history trend chart).
- [x] Manual E2E test against the deployed function (2026-08-01): `ai_jobs` row went `queued`→`completed` with a full score breakdown written to the job's `output`; `ai_usage` charged 3 credits.

## Phase 4 — AI Import ✅ done (with a scoped-down source-format list — see note)

- [x] `packages/ai/schemas/menuImport.ts`, `prompts/menuImport.ts`, `agents/menuImportAgent.ts`, `pipelines/importPipeline.ts`.
- [x] `packages/ai/agents/translationAgent.ts` extended with `translateMenuBatch` (whole-tree translation, one LLM call per target language instead of per field) and `packages/ai/prompts/translation.ts` extended with `buildMenuBatchTranslationPrompt`.
- [x] Edge Function `supabase/functions/ai-import-start/index.ts` (async job via `EdgeRuntime.waitUntil`, with a synchronous fallback where that global isn't available).
- [x] UI: "Importar con IA" entry point in `MenuEditor.tsx` (header + empty-categories state), new `src/components/dashboard/AiImportDialog.tsx` — source picker (paste text / PDF) → progress → fully editable review tree (rename/remove categories and items) → "Guardar en mi menú" commits via `commitImportedMenu()` in `src/lib/ai-api.ts`, which writes through the same tables the manual editor uses.
- [x] `src/hooks/useAiImport.ts` (Realtime subscription to the `ai_jobs` row).
- [x] Manual E2E test against the deployed function (2026-08-01): posted a 2-category plain-text menu, job went `queued`→`processing`→`completed` in ~20s with correctly parsed categories/items/prices/descriptions in `ai_jobs.output`; `ai_usage` charged 15 credits.

**Scope note — source formats actually implemented (updated 2026-08-05):** plain text paste and `.pdf` upload only. The website-URL source was removed at the owner's request (Import = text or PDF, nothing else). PDF text extraction uses `@firecrawl/pdf-inspector` — a native (napi-rs) Rust parser with prebuilt binaries for Vercel's Linux x64/arm64 glibc runtime — which returns layout-aware markdown (reading order, headings by font size, tables), materially better than raw pdf.js text for restaurant menus; if the native module can't load on a given platform it falls back to `unpdf` (pure JS, edge/serverless-safe), still in `package.json`. Scanned/image-only PDFs (no text layer) are rejected with a clear message; OCR is explicitly out of scope. **Website URL scraping, Word (.docx), Excel (.xlsx), and photo/image OCR are NOT implemented** — the functions reject those `sourceType`s with a clear error and the UI only offers text/PDF. Implementing the rest needs format-specific parsing libraries (mammoth, xlsx, and a vision-capable model call respectively) that weren't verified in this session — flagged honestly rather than shipped untested.

**Production import backend (Vercel, client-driven steps):** long menu imports run through `api/ai-import-start.ts` (creates the `ai_jobs` row with the raw source and returns) plus `api/ai-import-step.ts` (executes exactly one step: text prep, one chunk extraction, or one language translation) and are selected by the frontend in prod / via `VITE_AI_IMPORT_BACKEND`. The frontend (`useAiImport`) drives the loop, calling the step endpoint until the job completes. Because the client (not the function itself) chains the steps, each invocation is a single short LLM call — **a menu of any length can be imported with no platform duration limit**, and there is no self-invocation so Vercel's **508 INFINITE_LOOP_DETECTED** protection can never fire (an earlier design chained steps by POSTing back to `/api/ai-import-worker`, which Vercel killed mid-run; a single synchronous `waitUntil` call worked but was capped at the Hobby 300s function limit). State lives in `ai_jobs.input` between steps (retry-safe: each step reads fresh persisted state). Chunk size is **2500 chars** (overlap 350): deepseek's latency explodes superlinearly with input size (~8s on a 2k chunk vs ~215s and frequent stalls on 6k), so smaller chunks keep the primary model fast and reliable and leave room for the schema-repair turns. Per-LLM-call timeouts are generous (90s inactivity / 240s hard) and each step still guards with a ~280s deadline so a stalled model call fails cleanly instead of hitting the 300s platform kill.

**Model choice + schema-repair (validated live 2026-08-05):** the import tries a chain of endpoints, first-to-last: `deepseek-v4-flash` on the paid gateway (`AI_IMPORT_GO_BASE_URL`/`AI_IMPORT_GO_KEY`, default `https://opencode.ai/zen/go/v1`), then `deepseek-v4-pro` on the same paid gateway (`AI_IMPORT_GO_FALLBACK_MODEL`) — both are fast (~5-15s/chunk) and the fallback covers the case where `deepseek-v4-flash` is region-gated (403 RegionError until the account opts into China-hosted models) — then the free Zen models `deepseek-v4-flash-free` and `mimo-v2.5-free` (`AI_MODEL_MENU_IMPORT`, `OPENCODE_ZEN_API_KEYS`). `callStructured` implements **schema-repair** (same pattern as mindmap's `withSchemaRepair`): when output fails JSON parse / Zod validation, the model is re-called with its own raw output plus the validation error and told to fix it — up to `REPAIR_MAX_RETRIES` (2) corrective turns. Auth/billing/region errors (401/402/403/429) skip the endpoint immediately. `ling-3.0-flash-free` was dropped (output quality). Note: the paid gateway is keyed by the owner's own OpenCode API key (`AI_IMPORT_GO_KEY` on Vercel), which serves both Zen (`/zen/v1`) and GO (`/zen/go/v1`) — the same key works on both, only the base URL adds `/go/` (see opencode.ai/docs/go). A key whose workspace has no paid balance/quota returns 401/429 on paid models, in which case the import degrades to the free Zen models (`deepseek-v4-flash-free` → `mimo-v2.5-free`).

**Verification caveat:** this repo's sandbox has no Deno CLI available, so the Deno-side code (all of `packages/ai/{providers,agents,prompts,pipelines}`, all 4 `supabase/functions/ai-*` functions, and `_shared/*`) could not be typechecked or executed here — only manually reviewed for import/export consistency against the same patterns the existing (working) Edge Functions use. The frontend half (hooks, `ai-api.ts`, all UI components, the `@ai` schema types) passed `tsc --noEmit`, `eslint`, and `vite build` cleanly, including the new import-boundary rule. Treat every Edge Function as needing a real smoke test against a deployed Supabase project with live OpenCode Zen keys before relying on it — see the Deployment checklist below.

## Deployment checklist — DONE (2026-08-01)

- [x] `supabase secrets set OPENCODE_ZEN_API_KEYS=... AI_MODEL_DEFAULT=deepseek-v4-flash-free` on the live `dtmnomjbfziwfwheqcfx` project.
- [x] `supabase db push` (after repairing migration history for the 9 pre-existing base migrations that predated this engagement's tracking).
- [x] `supabase functions deploy ai-generate-description ai-translate ai-optimize-menu ai-import-start`.
- [x] One live end-to-end call per function, from a throwaway test user against the deployed project (see each phase's checklist above for specifics).

**Known caveat — free-model flakiness:** only one `OPENCODE_ZEN_API_KEYS` key is configured (the plan's "2-3 keys to rotate across" wasn't available this session), and the default model (`deepseek-v4-flash-free`) intermittently returned an empty/non-JSON response during testing — roughly 2 of 6 `ai-generate-description` calls failed with "model did not return valid JSON" before succeeding on retry; `ai-translate` also failed once out of two tries. `ai-optimize-menu` and `ai-import-start` succeeded on every attempt made. This is model-side flakiness, not a bug in the request/response handling — the fix is either more rotation keys or a paid/more-reliable model for `AI_MODEL_DEFAULT`, not a code change. Consider surfacing a "try again" affordance in the UI for the description/translation buttons given this.

**Note on Vercel:** `sacarta.vercel.app`'s `VITE_SUPABASE_*` production env vars already pointed at `dtmnomjbfziwfwheqcfx` before this session (confirmed live). The deployed bundle does not yet include this AI layer — it's still building from `main`, since these phases lived on `feature/ai-layer-phase-1-4` until this session merged and pushed it to `main` (see git history for the merge commit). A fresh Vercel deploy is triggered by that push.

## Phase 5 — AI Setup ✅ done

- [x] Migration `20260801160000_...`: `ALTER TYPE public.ai_job_type ADD VALUE 'ai_setup'` (no new tables — reuses `ai_jobs` + `importPipeline.ts` entirely, per spec).
- [x] Edge Function `ai-import-start` extended with an optional `jobType` body param (`menu_import` default, `ai_setup` allowed), so the onboarding flow tags its runs distinctly for analytics. Same pipeline, same 15-credit cost.
- [x] `src/lib/ai-api.ts` + `src/hooks/useAiImport.ts` + `src/components/dashboard/AiImportDialog.tsx`: `jobType` prop threaded through.
- [x] UI: `OnboardingWizard.tsx` fork after step 1 — "Crear mi menú a mano" (continues to the existing address/currency steps) vs. "Subir mi menú — la IA lo monta" (opens the AiImportDialog tagged `jobType="ai_setup"`; on commit, the auto-created empty default menu is deleted and the flow jumps to the existing `handleFinish()`).
- [x] Migración aplicada al proyecto vivo + `ai-import-start` redeployada.
- [x] Manual E2E test against the deployed function (2026-08-01): created a throwaway user/restaurant via the service-role admin API, called `ai-import-start` with `jobType="ai_setup"` and a 2-category plain-text menu — job went `queued→completed` with `job_type="ai_setup"`, correct parse, `ai_usage` charged 15 credits (kind `import`), then cleaned up.

## Phase 6 — AI Restaurant Copilot ✅ done

**Prerequisite validated live (2026-08-01):** before building any Copilot code, function-calling on the configured model (`deepseek-v4-flash-free`, OpenCode Zen) was tested against the real endpoint with the production key. Findings that shaped the design: (1) the model reliably emits `tool_calls` in `tool_choice:'auto'` mode and chains read-only → mutating calls across turns; (2) `tool_choice:'required'` is rejected by the provider (DeepSeek thinking-mode: `"Thinking mode does not support this tool_choice"`) — so the Copilot only ever uses `auto`; (3) DeepSeek thinking-mode demands `reasoning_content` be echoed back on the next turn, which the provider contract doesn't store — so the Copilot's loop disables thinking (`thinking:{type:'disabled'}`) and the multi-turn loop works. Both gotchas are documented here so a future session doesn't re-discover them.

- [x] `packages/ai/providers/types.ts` + `openaiCompatible.ts`: `LLMToolDefinition`, `LLMToolCall`, `tool_calls` on `LLMMessage`, and wire-format serialization (`type:'function'` + `function:{...}` wrapper — DeepSeek rejects the compact shape with "missing field `type`"). `AiFeatureKey` extended with `'copilot'`.
- [x] Migration `20260801170000_...`: `ai_copilot_conversations`, `ai_copilot_messages`, `ai_copilot_actions` (audit trail) + `ai_usage_kind` gains `'copilot'`. RLS: owner SELECT (+ INSERT for conversations), no client writes on messages/actions (service-role only).
- [x] `packages/ai/tools/definitions.ts` — the full 12-tool JSON-Schema set from `FEATURE_SPECIFICATIONS.md` §Phase 6 (2 read-only + 10 mutating; no hard-delete tool).
- [x] `packages/ai/tools/resolver.ts` — deterministic filter→rows resolver + before/after preview builders. The LLM never emits row IDs and never writes; this is the enforced boundary.
- [x] `packages/ai/tools/executor.ts` — the only code that mutates the DB on the agent's behalf; runs only after an owner-confirmed preview. `create_menu` supports optional tree-copy from another menu.
- [x] `packages/ai/agents/copilotAgent.ts` — the multi-turn loop: system prompt + history seed → read-only tools execute inline → first mutating tool produces a preview and stops (no write). `generate_new_items`/`bulk_translate` run their own generation/translation previews whose payload the executor persists verbatim on confirm.
- [x] `packages/ai/prompts/copilot.ts` — compact restaurant summary per turn (name/currency/languages/counts, never a menu dump) + strict system prompt (use search first, mutating tools for changes, "quitar/eliminar" → soft-hide, ask on ambiguity).
- [x] Edge Function `supabase/functions/ai-copilot/index.ts` — endpoints: `start_conversation`, `send_message`, `confirm_preview`, `cancel_preview`, `list_conversations`, `get_history`. Credit check + charge (2/turn) before/after each turn; previews TTL 15 min; confirm re-loads a fresh graph (no drift) and writes the audit row.
- [x] Frontend: `src/lib/ai-api.ts` copilot functions, `src/hooks/useAiCopilot.ts`, page `src/pages/dashboard/AiCopilot.tsx` (chat UI + preview cards with Confirm/Cancel + conversation list), route + sidebar entry "Copilot IA".
- [x] **Tooling upgrade:** Deno CLI installed (`/root/.deno/bin/deno`); all 4 existing AI Edge Functions + the new `ai-copilot` now pass `deno check` (previously the Deno side was never typechecked in this repo).
- [x] Manual E2E test against the deployed function (2026-08-01): seeded a throwaway pro-tier restaurant (3 items across Vinos/Entrantes), started a conversation, asked "sube un 10% el precio de todos los vinos" — agent chained `search_items` → `bulk_adjust_prices`, returned a preview (`2 platos`, 24→26.4, 18→19.8), **prices unchanged before confirm**, then `confirm_preview` applied exactly those 2 rows. `ai_copilot_actions` audit row recorded `status:executed` + `affected_rows`; `ai_usage` charged 2 credits (kind `copilot`); anon client sees 0 rows on `ai_copilot_actions` (RLS verified).

## Phase 7 — AI Business Insights + AI Recommendations ✅ done

- [x] Migration `20260801180000_...`: `ai_recommendations` (discrete dismissible cards with lifecycle, owner UPDATE for dismiss/action, service-role insert only) + `ai_job_type` gains `'business_insights'` + `ai_usage_kind` gains `'insights'`.
- [x] `packages/ai/schemas/insights.ts`, `prompts/insights.ts`, `agents/insightsAgent.ts`, `pipelines/insightsPipeline.ts` — deterministic metrics (30-day views, top items/categories, dietary counts, photo/description coverage, optimizer score trend) fed to the LLM for narrative + ≤5 recommendation proposals.
- [x] Edge Function `supabase/functions/ai-insights/index.ts` — synchronous: credit check → `ai_jobs` row (`business_insights`) → pipeline → narrative in `ai_jobs.output`, stale `open` cards deleted, new cards inserted (service-role), `ai_usage` charged 3 credits. Dismissed/actioned cards survive regeneration.
- [x] `src/lib/ai-api.ts` + `src/hooks/useAiInsights.ts` + UI section in `src/pages/dashboard/Analytics.tsx` (narrative panel + recommendation cards with done/dismiss actions).
- [x] **Provider hardening:** `generateStructured` in `openaiCompatible.ts` now retries empty/non-JSON completions up to 3× — mitigates the documented free-model flakiness that hit Insights on its first live attempt (empty body); re-benefits every AI feature.
- [x] Manual E2E test against the deployed function (2026-08-01): seeded a pro-tier restaurant (2 items, one vegan + one duplicated name, ~6 views), ran `ai-insights` — got a realistic Spanish narrative, 5 recommendations (fotos/descripciones/dietary/idiomas/vistas) with correct `target_type`/`target_id`, owner PATCH to `dismissed` worked (RLS), `ai_usage` charged 3 credits (kind `insights`).

## Phase 8 — AI Customer Assistant ✅ done

- [x] Migration `20260801190000_...`: `anon_chat_events` append-only rate-limit/usage table with composite indexes on `(restaurant_id, session_token, created_at)` and `(restaurant_id, ip_hash, created_at)`. **No RLS policies at all** — the Edge Function writes via service-role (which bypasses RLS); anon/authenticated clients are denied by default. Verified live: anon `SELECT` returns `[]`.
- [x] `packages/ai/schemas/customerAssistant.ts`, `prompts/customerAssistant.ts`, `agents/customerAssistantAgent.ts` — the safety-critical flow: (1) one LLM call extracts structured constraints, (2) `filterCandidates()` is PURE CODE (no LLM) enforcing every hard constraint (allergens with aliases, dietary flags, max price, exclude tags), (3) second LLM call ranks ONLY within the surviving set, (4) `validateRecommendations()` drops any hallucinated item id server-side.
- [x] Edge Function `supabase/functions/ai-customer-assistant/index.ts` — anon, read-only public menu access, plan-gated (`aiCustomerAssistantEnabled`), rate limits checked BEFORE any LLM call: per-session 20/hour, per-IP-hash 60/hour, per-restaurant daily cap tied to plan tier (150/300/600 for pro/lifetime). Salted IP hash via Web Crypto — raw IP never stored. Friendly "busy" reply on limit, no provider call.
- [x] Frontend: `src/lib/ai-api.ts` `sendCustomerAssistantMessage`, widget `src/components/public/CustomerAssistantWidget.tsx` (session token in localStorage, chat panel with recommendation cards, allergen/diet examples), wired into `PublicMenu.tsx`'s footer.
- [x] `PlanLimits.aiCustomerAssistantEnabled` added (free: false, pro/lifetime: true) + `LIMIT_LABELS`.
- [x] Manual E2E tests against the deployed function (2026-08-01), all passed live: (a) "soy celiaco" → only the gluten-free hummus recommended, carbonara/pizza correctly excluded; (b) "vegano <10€" → only hummus, non-vegan/over-budget excluded; (c) "no me gusta el picante" → spicy chicken never recommended; (d) anon RLS on `anon_chat_events` returns `[]`; (e) rate limit: 24 messages with one session token → exactly 4 rejected at the 20/hour cap.

## Deployment checklist — ALL PHASES 0-8 DONE

- [x] All migrations applied to the live `dtmnomjbfziwfwheqcfx` project (Phases 0, 5, 6, 7, 8).
- [x] All 8 AI Edge Functions deployed: `ai-generate-description`, `ai-translate`, `ai-optimize-menu`, `ai-import-start`, `ai-copilot`, `ai-insights`, `ai-customer-assistant` (+ the 4 pre-existing non-AI functions untouched).
- [x] Live end-to-end test per function (see each phase's checklist).
- [x] Deno CLI available in this environment now — all AI Edge Functions pass `deno check` before deploy (previously the Deno side was never typechecked here).

**Known caveat — free-model flakiness (unchanged from Phases 1-4):** the default model (`deepseek-v4-flash-free`) intermittently returns an empty/non-JSON body. Mitigated for structured output by the new 3× retry in `generateStructured` (added in Phase 7); the Copilot disables thinking-mode so its multi-turn tool loops are stable. The durable fix remains more rotation keys or a paid model for `AI_MODEL_DEFAULT` / `AI_MODEL_COPILOT`.

## AI Image Generation

Permanently excluded (see `VISION.md`), not merely deferred.

