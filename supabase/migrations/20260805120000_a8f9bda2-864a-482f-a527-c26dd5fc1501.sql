-- Ensure every restaurant always has a subscription row.
--
-- Previously the client inserted the default 'free' subscription in
-- createRestaurant (src/lib/api.ts), but subscriptions has no authenticated INSERT
-- policy ("No direct subscription creation", WITH CHECK (false)), so that insert
-- silently failed and restaurants were created without a subscription row. Those rows
-- are only ever written via the service-role Edge Functions (check/sync-subscription),
-- which use UPDATE — and UPDATE cannot create a missing row. Net effect: restaurants
-- without a row ran as free forever, and a real paid subscription never synced.
--
-- This trigger creates the default free subscription server-side (SECURITY DEFINER, so
-- RLS is bypassed), and the backfill below repairs the restaurants created before it.

CREATE OR REPLACE FUNCTION public.handle_new_restaurant_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (
    restaurant_id, plan, status, photos_limit, languages_limit,
    is_lifetime, cancel_at_period_end
  ) VALUES (
    NEW.id, 'free', 'active', 0, 1,
    false, false
  )
  ON CONFLICT (restaurant_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_restaurant_subscription ON public.restaurants;
CREATE TRIGGER trg_new_restaurant_subscription
  AFTER INSERT ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_restaurant_subscription();

-- Backfill restaurants created before the trigger existed.
INSERT INTO public.subscriptions (
  restaurant_id, plan, status, photos_limit, languages_limit,
  is_lifetime, cancel_at_period_end
)
SELECT r.id, 'free', 'active', 0, 1, false, false
FROM public.restaurants r
LEFT JOIN public.subscriptions s ON s.restaurant_id = r.id
WHERE s.id IS NULL
ON CONFLICT (restaurant_id) DO NOTHING;
