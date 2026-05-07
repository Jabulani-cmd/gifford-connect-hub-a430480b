
-- Fix overly permissive messaging RLS
DROP POLICY IF EXISTS "Authenticated read messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated read conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated read conversation_participants" ON public.conversation_participants;

-- Scope parents to only their linked children's marks
DROP POLICY IF EXISTS "Parents read child marks" ON public.marks;
CREATE POLICY "Parents read child marks"
ON public.marks
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'parent'::app_role)
  AND student_id IN (SELECT student_id FROM public.parent_students WHERE parent_id = auth.uid())
);

-- Set immutable search_path on functions flagged by linter
ALTER FUNCTION public.auto_provision_student() SET search_path = public;
ALTER FUNCTION public.update_invoice_payment() SET search_path = public;
ALTER FUNCTION public.column_exists(text, text) SET search_path = public;
