-- Fix storage policies - they incorrectly reference restaurants.name instead of the storage object name

-- Drop the broken policies
DROP POLICY IF EXISTS "Owners can upload images to their restaurant" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update their restaurant images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete their restaurant images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view published restaurant images" ON storage.objects;

-- Recreate with correct reference to storage object name
CREATE POLICY "Public can view published restaurant images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'menu-images' AND (
    -- Allow if restaurant is published
    EXISTS (
      SELECT 1 FROM public.restaurants 
      WHERE id::text = (storage.foldername(name))[1] 
      AND is_published = true
    )
    OR
    -- Or if user owns the restaurant
    (
      auth.uid() IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.restaurants 
        WHERE id::text = (storage.foldername(name))[1] 
        AND owner_id = auth.uid()
      )
    )
  )
);

-- Only restaurant owners can upload images to their folder
CREATE POLICY "Owners can upload images to their restaurant"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'menu-images' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE id::text = (storage.foldername(name))[1] 
    AND owner_id = auth.uid()
  )
);

-- Only restaurant owners can update their images
CREATE POLICY "Owners can update their restaurant images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'menu-images' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE id::text = (storage.foldername(name))[1] 
    AND owner_id = auth.uid()
  )
);

-- Only restaurant owners can delete their images
CREATE POLICY "Owners can delete their restaurant images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'menu-images' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE id::text = (storage.foldername(name))[1] 
    AND owner_id = auth.uid()
  )
);