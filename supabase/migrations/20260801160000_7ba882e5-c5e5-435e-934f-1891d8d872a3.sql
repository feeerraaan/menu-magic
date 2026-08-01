-- Phase 5 — AI Setup: onboarding's alternate "upload your menu" path.
-- Reuses the exact same import pipeline as Phase 4 (ai-import-start / importPipeline.ts),
-- distinguished only by a distinct ai_job_type value so setup runs are separable in
-- analytics. No new tables — see docs/FEATURE_SPECIFICATIONS.md §Phase 5.

ALTER TYPE public.ai_job_type ADD VALUE IF NOT EXISTS 'ai_setup';
