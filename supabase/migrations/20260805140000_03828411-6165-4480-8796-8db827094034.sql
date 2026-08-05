-- Superadmin backoffice — restaurant/menu deep control. All SECURITY DEFINER and gated by
-- has_role(auth.uid(), 'admin'); tables keep their existing RLS untouched.

-- Full restaurant + subscription snapshot (jsonb so it never breaks on new columns).
CREATE OR REPLACE FUNCTION public.admin_get_restaurant(_restaurant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN NULL;
  END IF;
  SELECT jsonb_build_object(
    'restaurant', to_jsonb(r),
    'subscription', to_jsonb(s)
  )
  INTO result
  FROM public.restaurants r
  LEFT JOIN public.subscriptions s ON s.restaurant_id = r.id
  WHERE r.id = _restaurant_id;
  RETURN result;
END;
$$;

-- Edit the restaurant configuration (the same fields the owner edits in Ajustes).
CREATE OR REPLACE FUNCTION public.admin_update_restaurant_config(
  _restaurant_id uuid,
  _name text,
  _address text,
  _phone text,
  _currency text,
  _default_language text,
  _supported_languages text[],
  _hide_prices boolean,
  _theme text,
  _is_published boolean,
  _logo_url text
)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.restaurants SET
    name = COALESCE(NULLIF(_name, ''), name),
    address = _address,
    phone = _phone,
    currency = COALESCE(_currency, currency),
    default_language = COALESCE(_default_language, default_language),
    supported_languages = COALESCE(_supported_languages, supported_languages),
    hide_prices = COALESCE(_hide_prices, hide_prices),
    theme = COALESCE(_theme, theme),
    is_published = COALESCE(_is_published, is_published),
    logo_url = _logo_url
  WHERE id = _restaurant_id AND public.has_role(auth.uid(), 'admin')
  RETURNING true
$$;

-- Menus of a restaurant with category/item counts.
CREATE OR REPLACE FUNCTION public.admin_list_menus(_restaurant_id uuid)
RETURNS TABLE (
  menu_id uuid,
  name text,
  description text,
  is_active boolean,
  schedule_rules jsonb,
  display_order integer,
  category_count bigint,
  item_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    m.id, m.name, m.description, m.is_active, m.schedule_rules, m.display_order,
    (SELECT count(*) FROM public.categories c WHERE c.menu_id = m.id),
    (SELECT count(*) FROM public.categories c
       JOIN public.items i ON i.category_id = c.id
     WHERE c.menu_id = m.id)
  FROM public.menus m
  WHERE m.restaurant_id = _restaurant_id AND public.has_role(auth.uid(), 'admin')
  ORDER BY m.display_order
$$;

CREATE OR REPLACE FUNCTION public.admin_create_menu(_restaurant_id uuid, _name text, _is_active boolean)
RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  INSERT INTO public.menus (restaurant_id, name, is_active, display_order)
  SELECT _restaurant_id, _name, COALESCE(_is_active, true),
         COALESCE((SELECT max(display_order) + 1 FROM public.menus WHERE restaurant_id = _restaurant_id), 0)
  WHERE public.has_role(auth.uid(), 'admin')
  RETURNING id
$$;

CREATE OR REPLACE FUNCTION public.admin_update_menu(
  _menu_id uuid,
  _name text,
  _description text,
  _is_active boolean
)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.menus SET
    name = COALESCE(NULLIF(_name, ''), name),
    description = _description,
    is_active = COALESCE(_is_active, is_active)
  WHERE id = _menu_id
    AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = menus.restaurant_id AND public.has_role(auth.uid(), 'admin'))
  RETURNING true
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_menu(_menu_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  DELETE FROM public.menus
  WHERE id = _menu_id
    AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = menus.restaurant_id AND public.has_role(auth.uid(), 'admin'))
  RETURNING true
$$;

-- Full menu tree (categories with their items) for read-only inspection.
CREATE OR REPLACE FUNCTION public.admin_get_menu_details(_menu_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN NULL;
  END IF;
  SELECT jsonb_build_object(
    'menu', to_jsonb(m),
    'categories', COALESCE(jsonb_agg(
      jsonb_build_object(
        'category', to_jsonb(c),
        'items', COALESCE((
          SELECT jsonb_agg(to_jsonb(i) ORDER BY i.display_order)
          FROM public.items i
          WHERE i.category_id = c.id
        ), '[]'::jsonb)
      ) ORDER BY c.display_order
    ), '[]'::jsonb)
  )
  INTO result
  FROM public.menus m
  LEFT JOIN public.categories c ON c.menu_id = m.id
  WHERE m.id = _menu_id
  GROUP BY m.id;
  RETURN result;
END;
$$;
