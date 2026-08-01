-- AI layer foundations: async job tracking, credit metering, menu-score history,
-- staged AI-generated content, and provenance flags on existing translation/item fields.
-- Supports Phases 1-4 (Description Generator, Translation, Menu Optimizer, AI Import).
-- No image-related columns/types are added — AI image generation is intentionally excluded.

CREATE TYPE public.ai_job_type AS ENUM ('menu_optimizer_run', 'menu_import');
CREATE TYPE public.ai_job_status AS ENUM ('queued', 'processing', 'completed', 'failed', 'canceled');

CREATE TABLE public.ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type public.ai_job_type NOT NULL,
  status public.ai_job_status NOT NULL DEFAULT 'queued',
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB,
  error TEXT,
  progress SMALLINT NOT NULL DEFAULT 0,
  ai_credits_charged INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own ai jobs" ON public.ai_jobs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));

CREATE POLICY "Owners can create own ai jobs" ON public.ai_jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
    AND created_by = auth.uid()
  );

-- Only the service-role Edge Function transitions job status/output/progress.
CREATE POLICY "No direct ai job updates" ON public.ai_jobs
  FOR UPDATE TO authenticated WITH CHECK (false);

CREATE POLICY "No direct ai job deletion" ON public.ai_jobs
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_ai_jobs_updated_at BEFORE UPDATE ON public.ai_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_jobs;

-- Credit ledger: every AI operation debits credits here; monthly/period limits are
-- enforced by summing this table, not by a mutable "remaining" counter.
CREATE TYPE public.ai_usage_kind AS ENUM ('description', 'translation', 'optimizer_run', 'import');

CREATE TABLE public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  kind public.ai_usage_kind NOT NULL,
  credits_charged INTEGER NOT NULL DEFAULT 1,
  ai_job_id UUID REFERENCES public.ai_jobs(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own ai usage" ON public.ai_usage
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));

CREATE POLICY "No direct ai usage writes" ON public.ai_usage
  FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "No direct ai usage updates" ON public.ai_usage
  FOR UPDATE TO authenticated WITH CHECK (false);

CREATE POLICY "No direct ai usage deletion" ON public.ai_usage
  FOR DELETE TO authenticated USING (false);

-- Sums credits used since the current billing period start (falls back to calendar-month
-- start for restaurants with no subscription period, e.g. free plan). Called by every
-- AI Edge Function before charging a new operation.
CREATE OR REPLACE FUNCTION public.get_ai_credits_used_this_period(_restaurant_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(credits_charged), 0)::INTEGER
  FROM public.ai_usage
  WHERE restaurant_id = _restaurant_id
    AND created_at >= COALESCE(
      (SELECT current_period_start FROM public.subscriptions WHERE restaurant_id = _restaurant_id),
      date_trunc('month', now())
    );
$$;

-- Menu Optimizer score history (independent of ai_jobs retention, for cheap trend queries).
CREATE TABLE public.ai_menu_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  ai_job_id UUID REFERENCES public.ai_jobs(id) ON DELETE SET NULL,
  score SMALLINT NOT NULL CHECK (score >= 0 AND score <= 100),
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_menu_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own menu scores" ON public.ai_menu_scores
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));

CREATE POLICY "No direct ai menu score writes" ON public.ai_menu_scores
  FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "No direct ai menu score updates" ON public.ai_menu_scores
  FOR UPDATE TO authenticated WITH CHECK (false);

CREATE POLICY "No direct ai menu score deletion" ON public.ai_menu_scores
  FOR DELETE TO authenticated USING (false);

-- Staged AI-generated content (descriptions, translations) pending owner accept/reject.
-- No 'image' content_type or image_url column — AI image generation is not implemented.
CREATE TYPE public.ai_content_type AS ENUM ('description', 'translation');
CREATE TYPE public.ai_content_target AS ENUM ('item', 'category');
CREATE TYPE public.ai_content_status AS ENUM ('pending', 'accepted', 'rejected');

CREATE TABLE public.ai_generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  ai_job_id UUID REFERENCES public.ai_jobs(id) ON DELETE SET NULL,
  content_type public.ai_content_type NOT NULL,
  target_type public.ai_content_target NOT NULL,
  target_id UUID NOT NULL,
  language TEXT,
  style TEXT,
  content TEXT NOT NULL,
  status public.ai_content_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

ALTER TABLE public.ai_generated_content ENABLE ROW LEVEL SECURITY;

-- Owners get full access: accepting/rejecting a draft is a normal user action.
-- Generation (INSERT of new pending rows with real content) only happens server-side
-- via the service-role client inside the relevant Edge Function.
CREATE POLICY "Owners can manage own ai generated content" ON public.ai_generated_content
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));

-- Provenance flags: distinguish AI-filled vs human-written content on existing tables.
CREATE TYPE public.content_origin AS ENUM ('human', 'ai_generated', 'ai_edited');

ALTER TABLE public.item_translations
  ADD COLUMN IF NOT EXISTS generated_by public.content_origin NOT NULL DEFAULT 'human';

ALTER TABLE public.category_translations
  ADD COLUMN IF NOT EXISTS generated_by public.content_origin NOT NULL DEFAULT 'human';

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS description_generated_by public.content_origin NOT NULL DEFAULT 'human';
