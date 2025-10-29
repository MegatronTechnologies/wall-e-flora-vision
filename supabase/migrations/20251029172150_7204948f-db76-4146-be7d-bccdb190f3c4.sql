-- Make detection-images storage bucket private for better security
UPDATE storage.buckets 
SET public = false 
WHERE id = 'detection-images';

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own detection images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can insert detection images" ON storage.objects;

-- Allow authenticated users to view their own images (via signed URLs)
CREATE POLICY "Users can view their own detection images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'detection-images' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.detections
    WHERE detections.user_id = auth.uid()
    AND detections.image_url LIKE '%' || storage.objects.name || '%'
  )
);

-- Allow service role to insert images (for edge functions)
CREATE POLICY "Service role can insert detection images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'detection-images'
);