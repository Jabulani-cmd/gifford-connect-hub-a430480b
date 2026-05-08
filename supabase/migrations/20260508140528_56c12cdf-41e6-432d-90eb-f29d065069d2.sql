CREATE POLICY "Deputy principal manage timetable_entries"
ON public.timetable_entries FOR ALL
USING (has_role(auth.uid(), 'deputy_principal'::app_role))
WITH CHECK (has_role(auth.uid(), 'deputy_principal'::app_role));

CREATE POLICY "HOD manage timetable_entries"
ON public.timetable_entries FOR ALL
USING (has_role(auth.uid(), 'hod'::app_role))
WITH CHECK (has_role(auth.uid(), 'hod'::app_role));