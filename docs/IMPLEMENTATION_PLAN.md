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
- [x] UI: "Importar con IA" entry point in `MenuEditor.tsx` (header + empty-categories state), new `src/components/dashboard/AiImportDialog.tsx` — source picker (paste text / PDF / URL) → progress → fully editable review tree (rename/remove categories and items) → "Guardar en mi menú" commits via `commitImportedMenu()` in `src/lib/ai-api.ts`, which writes through the same tables the manual editor uses.
- [x] `src/hooks/useAiImport.ts` (Realtime subscription to the `ai_jobs` row).
- [x] Manual E2E test against the deployed function (2026-08-01): posted a 2-category plain-text menu, job went `queued`→`processing`→`completed` in ~20s with correctly parsed categories/items/prices/descriptions in `ai_jobs.output`; `ai_usage` charged 15 credits.

**Scope note — source formats actually implemented:** plain text paste, `.pdf` upload (via the `unpdf` library, chosen because it's purpose-built for edge/serverless runtimes with no native bindings), and a website URL (fetched server-side, HTML tags stripped). **Word (.docx), Excel (.xlsx), and photo/image OCR are NOT implemented** in this pass — the Edge Function rejects those `sourceType`s with a clear error, and the UI doesn't offer them. Implementing them properly needs format-specific parsing libraries (mammoth, xlsx, and a vision-capable model call respectively) that weren't verified in this session — flagged honestly rather than shipped untested.

**Verification caveat:** this repo's sandbox has no Deno CLI available, so the Deno-side code (all of `packages/ai/{providers,agents,prompts,pipelines}`, all 4 `supabase/functions/ai-*` functions, and `_shared/*`) could not be typechecked or executed here — only manually reviewed for import/export consistency against the same patterns the existing (working) Edge Functions use. The frontend half (hooks, `ai-api.ts`, all UI components, the `@ai` schema types) passed `tsc --noEmit`, `eslint`, and `vite build` cleanly, including the new import-boundary rule. Treat every Edge Function as needing a real smoke test against a deployed Supabase project with live OpenCode Zen keys before relying on it — see the Deployment checklist below.

## Deployment checklist — DONE (2026-08-01)

- [x] `supabase secrets set OPENCODE_ZEN_API_KEYS=... AI_MODEL_DEFAULT=deepseek-v4-flash-free` on the live `dtmnomjbfziwfwheqcfx` project.
- [x] `supabase db push` (after repairing migration history for the 9 pre-existing base migrations that predated this engagement's tracking).
- [x] `supabase functions deploy ai-generate-description ai-translate ai-optimize-menu ai-import-start`.
- [x] One live end-to-end call per function, from a throwaway test user against the deployed project (see each phase's checklist above for specifics).

**Known caveat — free-model flakiness:** only one `OPENCODE_ZEN_API_KEYS` key is configured (the plan's "2-3 keys to rotate across" wasn't available this session), and the default model (`deepseek-v4-flash-free`) intermittently returned an empty/non-JSON response during testing — roughly 2 of 6 `ai-generate-description` calls failed with "model did not return valid JSON" before succeeding on retry; `ai-translate` also failed once out of two tries. `ai-optimize-menu` and `ai-import-start` succeeded on every attempt made. This is model-side flakiness, not a bug in the request/response handling — the fix is either more rotation keys or a paid/more-reliable model for `AI_MODEL_DEFAULT`, not a code change. Consider surfacing a "try again" affordance in the UI for the description/translation buttons given this.

**Note on Vercel:** `sacarta.vercel.app`'s `VITE_SUPABASE_*` production env vars already pointed at `dtmnomjbfziwfwheqcfx` before this session (confirmed live). The deployed bundle does not yet include this AI layer — it's still building from `main`, since these phases lived on `feature/ai-layer-phase-1-4` until this session merged and pushed it to `main` (see git history for the merge commit). A fresh Vercel deploy is triggered by that push.

## Explicitly not in this engagement (see `ROADMAP.md` / `FEATURE_SPECIFICATIONS.md`)

Phase 5 (AI Setup), Phase 6 (AI Copilot), Phase 7 (Insights + Recommendations), Phase 8 (Customer Assistant) are fully specified but not built. AI Image Generation is permanently excluded (see `VISION.md`), not merely deferred.
