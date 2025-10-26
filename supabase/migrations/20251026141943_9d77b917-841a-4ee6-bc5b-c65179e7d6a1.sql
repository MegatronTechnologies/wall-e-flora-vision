-- Remove public read access to detections table
DROP POLICY IF EXISTS "Public can view all detections" ON public.detections;

-- Create policy for users to view only their own detections
CREATE POLICY "Users can view their own detections"
ON public.detections
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy for superadmins to view all detections
CREATE POLICY "Superadmins can view all detections"
ON public.detections
FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));