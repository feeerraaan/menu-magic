-- Create policies for menu-images bucket

-- Allow authenticated users to upload images to their restaurant folder
CREATE POLICY "Users can upload to their restaurant folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'menu-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.restaurants WHERE owner_id = auth.uid()
  )
);

-- Allow authenticated users to update their own images
CREATE POLICY "Users can update their restaurant images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'menu-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.restaurants WHERE owner_id = auth.uid()
  )
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete their restaurant images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'menu-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.restaurants WHERE owner_id = auth.uid()
  )
);

-- Allow public read access to all images in the bucket
CREATE POLICY "Public can view menu images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'menu-images');