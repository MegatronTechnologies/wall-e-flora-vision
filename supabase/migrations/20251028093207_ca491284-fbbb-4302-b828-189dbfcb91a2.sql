-- First, check if we have any detections with NULL user_id and prevent the constraint
-- We'll update them to a system user or handle them differently

-- Remove all existing SELECT policies for detections
DROP POLICY IF EXISTS "Users can view their own detections" ON public.detections;
DROP POLICY IF EXISTS "Users can view their own detections and public detections" ON public.detections;
DROP POLICY IF EXISTS "Superadmins can view all detections" ON public.detections;

-- Create new policies: users see only their own, superadmins see all
CREATE POLICY "Users can view their own detections"
ON public.detections
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all detections"
ON public.detections
FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Remove all existing SELECT policies for detection_images
DROP POLICY IF EXISTS "Users can view their own detection images" ON public.detection_images;
DROP POLICY IF EXISTS "Users can view their own detection images and public detection images" ON public.detection_images;
DROP POLICY IF EXISTS "Superadmins can view all detection images" ON public.detection_images;

-- Create new policies for detection_images
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

CREATE POLICY "Superadmins can view all detection images"
ON public.detection_images
FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));