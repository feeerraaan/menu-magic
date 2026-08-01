-- Phase 7 — AI Business Insights + AI Recommendations. See docs/FEATURE_SPECIFICATIONS.md §Phase 7.
--
-- * The narrative (consultant-style text) is EPHEMERAL — regenerated on demand, stored only in
--   the ai_jobs.output of the run that produced it (job_type 'business_insights').
-- * Recommendations are DISCRETE, dismissible cards with their own lifecycle, so dismissing
--   one never requires regenerating the whole set. Written exclusively by the service-role
--   Edge Function; the owner only reads + flips status (a normal user action).

ALTER TYPE public.ai_job_type ADD VALUE IF NOT EXISTS 'business_insights';
ALTER TYPE public.ai_usage_kind ADD VALUE IF NOT EXISTS 'insights';

CREATE TABLE public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  ai_job_id UUID REFERENCES public.ai_jobs(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'general',
  target_type TEXT CHECK (target_type IN ('item', 'category', 'menu', 'restaurant')),
  target_id UUID,
  title TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own recommendations" ON public.ai_recommendations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));

-- Dismiss/action is a normal owner action; generating new cards is server-only.
CREATE POLICY "Owners can manage own recommendations" ON public.ai_recommendations
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));

CREATE POLICY "No direct recommendation inserts" ON public.ai_recommendations
  FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "No direct recommendation deletion" ON public.ai_recommendations
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_ai_recommendations_updated_at BEFORE UPDATE ON public.ai_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
