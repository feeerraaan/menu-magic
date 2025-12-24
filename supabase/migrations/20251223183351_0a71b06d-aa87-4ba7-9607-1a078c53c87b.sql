-- Create app_role enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'owner', 'user');

-- Create plan_type enum
CREATE TYPE public.plan_type AS ENUM ('free', 'pro_monthly', 'pro_annual', 'lifetime');

-- Create subscription_status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete');

-- Profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Restaurants table
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  default_language TEXT NOT NULL DEFAULT 'en',
  supported_languages TEXT[] NOT NULL DEFAULT ARRAY['en'],
  hide_prices BOOLEAN NOT NULL DEFAULT false,
  theme TEXT NOT NULL DEFAULT 'light',
  custom_domain TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage own restaurants" ON public.restaurants
  FOR ALL TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "Public can view published restaurants by slug" ON public.restaurants
  FOR SELECT TO anon USING (is_published = true);

-- Menus table
CREATE TABLE public.menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  schedule_rules JSONB,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage menus" ON public.menus
  FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));

CREATE POLICY "Public can view active menus" ON public.menus
  FOR SELECT TO anon 
  USING (is_active = true AND EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND is_published = true));

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage categories" ON public.categories
  FOR ALL TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.menus m 
    JOIN public.restaurants r ON m.restaurant_id = r.id 
    WHERE m.id = menu_id AND r.owner_id = auth.uid()
  ));

CREATE POLICY "Public can view active categories" ON public.categories
  FOR SELECT TO anon 
  USING (is_active = true AND EXISTS (
    SELECT 1 FROM public.menus m 
    JOIN public.restaurants r ON m.restaurant_id = r.id 
    WHERE m.id = menu_id AND r.is_published = true AND m.is_active = true
  ));

-- Items table
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_vegetarian BOOLEAN NOT NULL DEFAULT false,
  is_vegan BOOLEAN NOT NULL DEFAULT false,
  is_spicy BOOLEAN NOT NULL DEFAULT false,
  is_gluten_free BOOLEAN NOT NULL DEFAULT false,
  allergens TEXT[] DEFAULT ARRAY[]::TEXT[],
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage items" ON public.items
  FOR ALL TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.categories c 
    JOIN public.menus m ON c.menu_id = m.id 
    JOIN public.restaurants r ON m.restaurant_id = r.id 
    WHERE c.id = category_id AND r.owner_id = auth.uid()
  ));

CREATE POLICY "Public can view active items" ON public.items
  FOR SELECT TO anon 
  USING (is_active = true AND EXISTS (
    SELECT 1 FROM public.categories c 
    JOIN public.menus m ON c.menu_id = m.id 
    JOIN public.restaurants r ON m.restaurant_id = r.id 
    WHERE c.id = category_id AND r.is_published = true AND m.is_active = true AND c.is_active = true
  ));

-- Category translations
CREATE TABLE public.category_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, language)
);

ALTER TABLE public.category_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage translations" ON public.category_translations
  FOR ALL TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.categories c 
    JOIN public.menus m ON c.menu_id = m.id 
    JOIN public.restaurants r ON m.restaurant_id = r.id 
    WHERE c.id = category_id AND r.owner_id = auth.uid()
  ));

CREATE POLICY "Public can view translations" ON public.category_translations
  FOR SELECT TO anon USING (true);

-- Item translations
CREATE TABLE public.item_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, language)
);

ALTER TABLE public.item_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage item translations" ON public.item_translations
  FOR ALL TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.items i 
    JOIN public.categories c ON i.category_id = c.id 
    JOIN public.menus m ON c.menu_id = m.id 
    JOIN public.restaurants r ON m.restaurant_id = r.id 
    WHERE i.id = item_id AND r.owner_id = auth.uid()
  ));

CREATE POLICY "Public can view item translations" ON public.item_translations
  FOR SELECT TO anon USING (true);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL UNIQUE REFERENCES public.restaurants(id) ON DELETE CASCADE,
  plan plan_type NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  is_lifetime BOOLEAN NOT NULL DEFAULT false,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  photos_limit INTEGER NOT NULL DEFAULT 0,
  languages_limit INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));

CREATE POLICY "Owners can update own subscriptions" ON public.subscriptions
  FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));

-- Menu analytics
CREATE TABLE public.menu_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  language TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert views" ON public.menu_views
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Owners can view own analytics" ON public.menu_views
  FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_restaurants_updated_at BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_menus_updated_at BEFORE UPDATE ON public.menus
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_items_updated_at BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Generate unique slug function
CREATE OR REPLACE FUNCTION public.generate_unique_slug(base_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  new_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := lower(regexp_replace(base_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  new_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM public.restaurants WHERE slug = new_slug) LOOP
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN new_slug;
END;
$$;

-- Create storage bucket for menu images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('menu-images', 'menu-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Storage policies
CREATE POLICY "Anyone can view menu images" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'menu-images');

CREATE POLICY "Authenticated users can upload images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "Users can update own images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'menu-images');

CREATE POLICY "Users can delete own images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'menu-images');