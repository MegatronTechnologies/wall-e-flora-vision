-- Drop existing superadmin delete policies if they exist
DROP POLICY IF EXISTS "Superadmins can delete detections" ON public.detections;
DROP POLICY IF EXISTS "Superadmins can delete detection images" ON public.detection_images;

-- Grant superadmins permission to delete detections
CREATE POLICY "Superadmins can delete detections"
ON public.detections
FOR DELETE
USING (has_role(auth.uid(), 'superadmin'));

-- Grant superadmins permission to delete detection images
CREATE POLICY "Superadmins can delete detection images"
ON public.detection_images
FOR DELETE
USING (has_role(auth.uid(), 'superadmin'));