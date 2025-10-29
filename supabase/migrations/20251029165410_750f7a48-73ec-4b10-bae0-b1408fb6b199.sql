-- Enable users to delete their own detections
CREATE POLICY "Users can delete their own detections"
ON public.detections
FOR DELETE
USING (auth.uid() = user_id);

-- Enable users to delete detection images when deleting their detections
CREATE POLICY "Users can delete their own detection images"
ON public.detection_images
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM detections
    WHERE detections.id = detection_images.detection_id
    AND detections.user_id = auth.uid()
  )
);

-- Enable superadmins to delete any detection
CREATE POLICY "Superadmins can delete any detection"
ON public.detections
FOR DELETE
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Enable superadmins to delete any detection image
CREATE POLICY "Superadmins can delete any detection image"
ON public.detection_images
FOR DELETE
USING (has_role(auth.uid(), 'superadmin'::app_role));