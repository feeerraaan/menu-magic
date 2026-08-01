-- Phase 8 — AI Customer Assistant: anonymous public chat on the menu page (/m/:slug).
-- Safety-critical design from docs/FEATURE_SPECIFICATIONS.md §Phase 8:
--   * Read-only, anon, no auth wall, real LLM cost per message.
--   * Deterministic pre-filter FIRST (plain code, no LLM) enforces hard constraints
--     (allergens, dietary flags, max price); the LLM only ranks within the surviving set.
--   * Server-side validation drops any item id the model references that isn't in the
--     pre-filtered candidate set (hallucination safety net).
--   * Rate limiting via this append-only events table with composite indexes on
--     (restaurant_id, session_token, created_at) and (restaurant_id, ip_hash, created_at).
-- The table is written exclusively by the Edge Function (service-role). No anon/authenticated
-- policies exist at all — public clients can neither read nor write it.

CREATE TABLE public.anon_chat_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.anon_chat_events ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies for any role: the Edge Function uses the
-- service-role client, so RLS never blocks it (service-role bypasses RLS) while every other
-- client (anon, authenticated) is denied by default.

CREATE INDEX anon_chat_events_restaurant_session_idx
  ON public.anon_chat_events (restaurant_id, session_token, created_at);

CREATE INDEX anon_chat_events_restaurant_ip_idx
  ON public.anon_chat_events (restaurant_id, ip_hash, created_at);
