-- Superadmin backoffice helpers.
--
-- Every function is SECURITY DEFINER and refuses to do anything unless the caller has the
-- 'admin' role (checked via the pre-existing has_role(auth.uid(), 'admin') SECURITY DEFINER
-- function). Admins only ever reach the underlying tables through these RPCs — the tables
-- themselves keep their existing RLS exactly as-is, so this adds a privileged surface
-- without weakening any client-facing policy.

-- List every user with their restaurant + subscription (one row per user).
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  user_created_at timestamptz,
  restaurant_id uuid,
  restaurant_name text,
  slug text,
  is_published boolean,
  plan text,
  subscription_status text,
  photos_limit integer,
  languages_limit integer,
  manual_override boolean,
  stripe_subscription_id text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    u.id, u.email, u.created_at,
    r.id, r.name, r.slug, r.is_published,
    s.plan::text, s.status::text, s.photos_limit, s.languages_limit,
    s.manual_override, s.stripe_subscription_id
  FROM auth.users u
  LEFT JOIN public.restaurants r ON r.owner_id = u.id
  LEFT JOIN public.subscriptions s ON s.restaurant_id = r.id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY u.created_at DESC
$$;

-- Edit a restaurant's name / publish state.
CREATE OR REPLACE FUNCTION public.admin_update_restaurant(
  _restaurant_id uuid,
  _name text,
  _is_published boolean
)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.restaurants SET
    name = COALESCE(_name, name),
    is_published = COALESCE(_is_published, is_published)
  WHERE id = _restaurant_id AND public.has_role(auth.uid(), 'admin')
  RETURNING true
$$;

-- Grant/change a restaurant's plan and limits. Marks manual_override so the value survives
-- Stripe syncs (mirrors the existing staff-grant mechanism, see check-subscription).
CREATE OR REPLACE FUNCTION public.admin_update_subscription(
  _restaurant_id uuid,
  _plan text,
  _photos_limit integer,
  _languages_limit integer
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _valid_plan public.plan_type;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN false;
  END IF;

  BEGIN
    _valid_plan := _plan::public.plan_type;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;

  UPDATE public.subscriptions SET
    plan = _valid_plan,
    status = 'active',
    photos_limit = COALESCE(_photos_limit, photos_limit),
    languages_limit = COALESCE(_languages_limit, languages_limit),
    manual_override = true
  WHERE restaurant_id = _restaurant_id;

  RETURN FOUND;
END;
$$;
