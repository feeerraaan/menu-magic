-- Fix translation tables exposure - restrict to published content only

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Public can view translations" ON category_translations;
DROP POLICY IF EXISTS "Public can view item translations" ON item_translations;

-- Create restrictive policies that only expose translations for published restaurants
CREATE POLICY "Public view published category translations" 
ON category_translations FOR SELECT TO anon 
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN menus m ON c.menu_id = m.id
    JOIN restaurants r ON m.restaurant_id = r.id
    WHERE c.id = category_id 
    AND r.is_published = true 
    AND m.is_active = true 
    AND c.is_active = true
  )
);

CREATE POLICY "Public view published item translations" 
ON item_translations FOR SELECT TO anon 
USING (
  EXISTS (
    SELECT 1 FROM items i
    JOIN categories c ON i.category_id = c.id
    JOIN menus m ON c.menu_id = m.id
    JOIN restaurants r ON m.restaurant_id = r.id
    WHERE i.id = item_id 
    AND r.is_published = true 
    AND m.is_active = true 
    AND c.is_active = true
    AND i.is_active = true
  )
);