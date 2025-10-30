-- Create storage policy for superadmin to delete files
CREATE POLICY "Superadmins can delete any file"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'detection-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'superadmin'
  )
);