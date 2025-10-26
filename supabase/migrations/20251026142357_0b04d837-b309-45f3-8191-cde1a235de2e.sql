-- Remove all existing SELECT policies from detection_images table
DROP POLICY IF EXISTS "Public can view all detection images" ON public.detection_images;
DROP POLICY IF EXISTS "Users can view their own detection images" ON public.detection_images;
DROP POLICY IF EXISTS "Superadmins can view all detection images" ON public.detection_images;

-- Create policy for users to view only images from their own detections
CREATE POLICY "Users can view their own detection images"
ON public.detection_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.detections
    WHERE detections.id = detection_images.detection_id
      AND detections.user_id = auth.uid()
  )
);

-- Create policy for superadmins to view all detection images
CREATE POLICY "Superadmins can view all detection images"
ON public.detection_images
FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));