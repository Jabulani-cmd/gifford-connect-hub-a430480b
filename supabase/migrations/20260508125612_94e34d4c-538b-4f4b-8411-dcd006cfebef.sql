CREATE OR REPLACE FUNCTION public.get_public_staff_names(_staff_ids uuid[])
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.full_name
  FROM public.staff s
  WHERE s.id = ANY(COALESCE(_staff_ids, ARRAY[]::uuid[]))
    AND s.full_name IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_staff_names(uuid[]) TO anon, authenticated;