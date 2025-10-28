-- Remove public access to detections - only allow users to see their own detections
DROP POLICY IF EXISTS "Users can view their own detections and public detections" ON public.detections;

CREATE POLICY "Users can view their own detections"
ON public.detections
FOR SELECT
USING (auth.uid() = user_id);

-- Update detection_images policy to match
DROP POLICY IF EXISTS "Users can view their own detection images and public detection images" ON public.detection_images;

CREATE POLICY "Users can view their own detection images"
ON public.detection_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM detections
    WHERE detections.id = detection_images.detection_id
      AND detections.user_id = auth.uid()
  )
);

-- Make user_id required in detections table (update existing NULL values first)
-- This will fail if there are existing rows with NULL user_id
-- First, delete all detections with NULL user_id (they are insecure)
DELETE FROM public.detections WHERE user_id IS NULL;

-- Now make the column NOT NULL
ALTER TABLE public.detections 
ALTER COLUMN user_id SET NOT NULL;