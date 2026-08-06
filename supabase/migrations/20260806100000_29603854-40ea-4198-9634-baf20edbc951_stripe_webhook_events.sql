-- Stripe webhook idempotency ledger.
--
-- The stripe-webhook Edge Function records every processed event id here. Replayed
-- deliveries (Stripe retries after a timeout, or manual re-sends from the Stripe CLI)
-- are detected and skipped, so webhook handling stays idempotent without double-applying
-- plan changes.

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- No RLS policies: the stripe-webhook Edge Function reads/writes via service-role
-- (bypasses RLS); anon and authenticated clients are denied by default.
