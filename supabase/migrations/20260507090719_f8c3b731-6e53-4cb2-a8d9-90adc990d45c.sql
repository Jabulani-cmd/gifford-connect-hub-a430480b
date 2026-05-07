
CREATE POLICY "Authors delete own announcements"
ON public.announcements
FOR DELETE
TO authenticated
USING (
  author_id = auth.uid()
  OR has_role(auth.uid(), 'deputy_principal'::app_role)
  OR has_role(auth.uid(), 'hod'::app_role)
);

CREATE POLICY "Authors update own announcements"
ON public.announcements
FOR UPDATE
TO authenticated
USING (
  author_id = auth.uid()
  OR has_role(auth.uid(), 'deputy_principal'::app_role)
  OR has_role(auth.uid(), 'hod'::app_role)
);
