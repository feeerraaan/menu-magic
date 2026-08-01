# SaCarta AI Implementation Plan — build checklist

Living document — update the checkboxes as each phase ships, per the project rule "after each completed feature, update documentation, commit cleanly, continue." See `AI_ARCHITECTURE.md` for the technical design and `FEATURE_SPECIFICATIONS.md` for per-feature specs.

## Phase 0 — Foundations

- [ ] Migration: `ai_jobs`, `ai_usage` (+ `get_ai_credits_used_this_period`), `ai_menu_scores`, `ai_generated_content`, provenance columns (`generated_by` on translations, `description_generated_by` on items), `ai_jobs` added to `supabase_realtime` publication.
- [ ] `PlanLimits` de-duplication: `src/lib/subscription-limits.ts` is the single source of truth; `src/types/database.ts`'s dead copy removed or re-exported.
- [ ] `aiCreditsPerMonth` added to `PlanLimits` + `PLAN_LIMITS`; `AI_CREDIT_COSTS` constant added.
- [ ] `packages/ai/{schemas,providers,agents,prompts,tools,pipelines}/` created; `providers/types.ts`, `providers/openaiCompatible.ts`, `providers/opencodeZen.ts`, `providers/registry.ts`, `schemas/common.ts` written.
- [ ] `vite.config.ts` / `tsconfig.app.json`: `@ai` alias to `packages/ai/schemas`.
- [ ] `eslint.config.js`: import-boundary rule blocking `src/**` from `packages/ai/{providers,agents,tools,pipelines}/**`.
- [ ] `supabase/config.toml`: entries for each new Edge Function (`verify_jwt = false`, manual JWT check inside, matching existing convention).

## Phase 1 — AI Description Generator

- [ ] `packages/ai/schemas/description.ts`, `prompts/descriptionGenerator.ts`, `agents/descriptionAgent.ts`.
- [ ] Edge Function `supabase/functions/ai-generate-description/index.ts`.
- [ ] `src/lib/ai-api.ts` (new), `src/hooks/useAiDescription.ts` (new).
- [ ] UI: "Generar con IA" button + style selector in `ItemDialogWithTranslations.tsx`.
- [ ] Manual E2E test: generate a description for a real item, confirm it only saves after the existing Save button is clicked, confirm `ai_usage` gets a 1-credit row, confirm free-tier cap rejection past 20 credits.

## Phase 2 — AI Translation

- [ ] `packages/ai/schemas/translation.ts`, `prompts/translation.ts`, `agents/translationAgent.ts`.
- [ ] Edge Function `supabase/functions/ai-translate/index.ts`.
- [ ] `src/hooks/useAiTranslation.ts`.
- [ ] UI: "Traducir con IA" button per language tab in `ItemDialogWithTranslations.tsx` and `CategoryDialogWithTranslations.tsx`.
- [ ] Manual E2E test: translate a field into a second supported language, confirm culinary terms are explained not mistranslated, confirm `generated_by` is set on save.

## Phase 3 — AI Menu Optimizer

- [ ] `packages/ai/schemas/optimizer.ts`, `prompts/optimizer.ts`, `agents/optimizerAgent.ts`.
- [ ] Edge Function `supabase/functions/ai-optimize-menu/index.ts` (async job pattern).
- [ ] `src/pages/dashboard/AiOptimizer.tsx` + nav entry in `DashboardSidebar.tsx`.
- [ ] `src/hooks/useAiOptimizer.ts` (Realtime subscription to `ai_jobs`).
- [ ] Manual E2E test: run an optimizer pass, confirm the job row transitions queued→completed, confirm score + breakdown render, confirm `ai_menu_scores` history accumulates on repeat runs.

## Phase 4 — AI Import

- [ ] `packages/ai/schemas/menuImport.ts`, `prompts/menuImport.ts`, `agents/menuImportAgent.ts`, `pipelines/importPipeline.ts`.
- [ ] Edge Function `supabase/functions/ai-import-start/index.ts` (async job, `EdgeRuntime.waitUntil` for long-running extraction).
- [ ] UI: "Importar con IA" entry point in `MenuEditor.tsx` (empty-categories state + menu-selection bar), review screen for the extracted tree before commit.
- [ ] `src/hooks/useAiImport.ts`.
- [ ] Manual E2E test: import a real sample PDF menu, confirm the extracted tree is fully editable before save, confirm nothing publishes without explicit confirmation, confirm auto-translation into all `supported_languages` runs, confirm 15-credit charge.

## Deployment checklist (do once code for a phase is ready, requires the user's go-ahead + OpenCode Zen keys)

- [ ] `supabase secrets set OPENCODE_ZEN_API_KEYS=... AI_MODEL_DEFAULT=...` (and per-feature overrides as needed).
- [ ] `supabase db push` (or apply the new migration via the project's Supabase MCP/CLI).
- [ ] `supabase functions deploy ai-generate-description ai-translate ai-optimize-menu ai-import-start`.
- [ ] One live end-to-end call per function from the deployed frontend before marking a phase "done" in this file.

## Explicitly not in this engagement (see `ROADMAP.md` / `FEATURE_SPECIFICATIONS.md`)

Phase 5 (AI Setup), Phase 6 (AI Copilot), Phase 7 (Insights + Recommendations), Phase 8 (Customer Assistant) are fully specified but not built. AI Image Generation is permanently excluded (see `VISION.md`), not merely deferred.
