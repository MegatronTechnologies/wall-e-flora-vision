-- Make user_id nullable again to support automated detections from Raspberry Pi
-- Automated detections don't have user context

ALTER TABLE public.detections
ALTER COLUMN user_id DROP NOT NULL;

-- Update RLS policies to handle NULL user_id
-- Detections with NULL user_id are from automated Raspberry Pi submissions

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view their own detections" ON public.detections;
DROP POLICY IF EXISTS "Superadmins can view all detections" ON public.detections;

-- Create new policies that handle NULL user_id
-- Users see their own detections
CREATE POLICY "Users can view their own detections"
ON public.detections
FOR SELECT
USING (auth.uid() = user_id);

-- Users can also see automated detections (NULL user_id) from devices they have access to
-- For now, we'll make all automated detections visible to authenticated users
CREATE POLICY "Users can view automated detections"
ON public.detections
FOR SELECT
USING (user_id IS NULL AND auth.role() = 'authenticated');

-- Superadmins can view all detections
CREATE POLICY "Superadmins can view all detections"
ON public.detections
FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Update detection_images policies similarly
DROP POLICY IF EXISTS "Users can view their own detection images" ON public.detection_images;
DROP POLICY IF EXISTS "Superadmins can view all detection images" ON public.detection_images;

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

CREATE POLICY "Users can view automated detection images"
ON public.detection_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM detections
    WHERE detections.id = detection_images.detection_id
      AND detections.user_id IS NULL
      AND auth.role() = 'authenticated'
  )
);

CREATE POLICY "Superadmins can view all detection images"
ON public.detection_images
FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));
