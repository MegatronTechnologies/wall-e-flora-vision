-- Update RLS policy to allow users to see their own detections AND detections with null user_id (from Raspberry Pi)
DROP POLICY IF EXISTS "Users can view their own detections" ON public.detections;

CREATE POLICY "Users can view their own detections and public detections"
ON public.detections
FOR SELECT
USING (
  auth.uid() = user_id 
  OR user_id IS NULL
);

-- Update detection_images RLS policy similarly
DROP POLICY IF EXISTS "Users can view their own detection images" ON public.detection_images;

CREATE POLICY "Users can view their own detection images and public detection images"
ON public.detection_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM detections
    WHERE detections.id = detection_images.detection_id
      AND (detections.user_id = auth.uid() OR detections.user_id IS NULL)
  )
);