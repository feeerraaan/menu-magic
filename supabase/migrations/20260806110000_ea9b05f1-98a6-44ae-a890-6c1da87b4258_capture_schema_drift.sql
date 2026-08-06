-- Capture schema drift: restaurants columns that existed in production but were never
-- tracked in the migration history. Fresh environments built from migrations were
-- missing them, which broke the public menu (template/website_url/instagram_url).
-- Definitions match the live DB exactly; IF NOT EXISTS makes this safe to re-run.

ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS template text NOT NULL DEFAULT 'classic';
