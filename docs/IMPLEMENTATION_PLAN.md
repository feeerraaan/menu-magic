# SaCarta AI Implementation Plan — build checklist

Living document — update the checkboxes as each phase ships, per the project rule "after each completed feature, update documentation, commit cleanly, continue." See `AI_ARCHITECTURE.md` for the technical design and `FEATURE_SPECIFICATIONS.md` for per-feature specs.

## Phase 0 — Foundations

- [x] Migration: `ai_jobs`, `ai_usage` (+ `get_ai_credits_used_this_period`), `ai_menu_scores`, `ai_generated_content`, provenance columns (`generated_by` on translations, `description_generated_by` on items), `ai_jobs` added to `supabase_realtime` publication. (written, not yet applied to the live Supabase project — see Deployment checklist)
- [x] `PlanLimits` de-duplication: `src/lib/subscription-limits.ts` is the single source of truth; `src/types/database.ts`'s dead copy removed (nothing imported it).
- [x] `aiCreditsPerMonth` added to `PlanLimits` + `PLAN_LIMITS`; `AI_CREDIT_COSTS` constant added.
- [x] `packages/ai/{schemas,providers,agents,prompts,tools,pipelines}/` created; `providers/types.ts`, `providers/openaiCompatible.ts`, `providers/opencodeZen.ts`, `providers/registry.ts`, `schemas/common.ts` written.
- [x] `vite.config.ts` / `tsconfig.app.json`: `@ai` alias to `packages/ai/schemas`.
- [x] `eslint.config.js`: import-boundary rule blocking `src/**` from `packages/ai/{providers,agents,tools,pipelines}/**` (smoke-tested, confirmed it fires).
- [x] `supabase/config.toml`: entries added per function as each is created.
- [x] `supabase/functions/_shared/{cors,aiAuth,aiCredits}.ts` — shared JWT/RLS-client/credit-metering helpers reused by every AI Edge Function.

## Phase 1 — AI Description Generator ✅ done

- [x] `packages/ai/schemas/description.ts`, `prompts/descriptionGenerator.ts`, `agents/descriptionAgent.ts`.
- [x] Edge Function `supabase/functions/ai-generate-description/index.ts`.
- [x] `src/lib/ai-api.ts` (new), `src/hooks/useAiDescription.ts` (new).
- [x] UI: "Generar con IA" button + style selector in `ItemDialogWithTranslations.tsx`.
- [ ] Manual E2E test against the deployed function (needs OpenCode Zen keys + `supabase db push`/`functions deploy` — see Deployment checklist). Verified so far: typecheck, lint (incl. the import-boundary rule), and `vite build` all pass.

## Phase 2 — AI Translation ✅ done

- [x] `packages/ai/schemas/translation.ts`, `prompts/translation.ts`, `agents/translationAgent.ts`.
- [x] Edge Function `supabase/functions/ai-translate/index.ts`.
- [x] `src/hooks/useAiTranslation.ts`.
- [x] UI: "Traducir con IA" button per language tab in `ItemDialogWithTranslations.tsx` and `CategoryDialogWithTranslations.tsx` (added `restaurantId` prop to the latter, wired from `MenuEditor.tsx`).
- [ ] Manual E2E test against the deployed function (same prerequisite as Phase 1). Verified so far: typecheck, lint, and `vite build` all pass.

## Phase 3 — AI Menu Optimizer ✅ done

- [x] `packages/ai/schemas/optimizer.ts`, `prompts/optimizer.ts`, `agents/optimizerAgent.ts`, `pipelines/optimizerPipeline.ts` (deterministic metrics extraction — first use of the pipelines/ folder).
- [x] Edge Function `supabase/functions/ai-optimize-menu/index.ts` (creates an `ai_jobs` row, runs inline, writes `ai_menu_scores` + job output — first feature to exercise the async-job table).
- [x] `src/pages/dashboard/AiOptimizer.tsx` + nav entry in `DashboardSidebar.tsx`.
- [x] `src/hooks/useAiOptimizer.ts` (Realtime subscription to `ai_jobs`, plus score-history trend chart).
- [ ] Manual E2E test against the deployed function (same prerequisite as Phases 1-2). Verified so far: typecheck, lint, and `vite build` all pass.
- Note: `src/lib/ai-api.ts`'s `fetchMenuScoreHistory` casts the Supabase client narrowly (`untypedSupabase`) since `ai_menu_scores` isn't in the generated `Database` type yet — regenerate `src/integrations/supabase/types.ts` after applying the Phase 0 migration and this cast can be removed.

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
