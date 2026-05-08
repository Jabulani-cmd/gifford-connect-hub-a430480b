CREATE OR REPLACE FUNCTION public.current_staff_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM public.staff s
  WHERE s.user_id = auth.uid()
    AND COALESCE(s.status, 'active') <> 'deleted'
  ORDER BY s.created_at DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.current_staff_id() TO authenticated;

DROP POLICY IF EXISTS "Teachers and management upload academic media" ON storage.objects;
DROP POLICY IF EXISTS "Teachers and management update academic media" ON storage.objects;
DROP POLICY IF EXISTS "Teachers and management delete academic media" ON storage.objects;

CREATE POLICY "Teachers and management upload academic media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'school-media'
  AND split_part(name, '/', 1) IN ('materials', 'assessments', 'announcements')
  AND split_part(name, '/', 2) IN (auth.uid()::text, public.current_staff_id()::text)
  AND (
    public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'hod')
    OR public.has_role(auth.uid(), 'deputy_principal')
    OR public.has_role(auth.uid(), 'principal')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'admin_supervisor')
  )
);

CREATE POLICY "Teachers and management update academic media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'school-media'
  AND split_part(name, '/', 1) IN ('materials', 'assessments', 'announcements')
  AND split_part(name, '/', 2) IN (auth.uid()::text, public.current_staff_id()::text)
  AND (
    public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'hod')
    OR public.has_role(auth.uid(), 'deputy_principal')
    OR public.has_role(auth.uid(), 'principal')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'admin_supervisor')
  )
)
WITH CHECK (
  bucket_id = 'school-media'
  AND split_part(name, '/', 1) IN ('materials', 'assessments', 'announcements')
  AND split_part(name, '/', 2) IN (auth.uid()::text, public.current_staff_id()::text)
  AND (
    public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'hod')
    OR public.has_role(auth.uid(), 'deputy_principal')
    OR public.has_role(auth.uid(), 'principal')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'admin_supervisor')
  )
);

CREATE POLICY "Teachers and management delete academic media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'school-media'
  AND split_part(name, '/', 1) IN ('materials', 'assessments', 'announcements')
  AND split_part(name, '/', 2) IN (auth.uid()::text, public.current_staff_id()::text)
  AND (
    public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'hod')
    OR public.has_role(auth.uid(), 'deputy_principal')
    OR public.has_role(auth.uid(), 'principal')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'admin_supervisor')
  )
);