
ALTER TABLE public.timetable_entries
  ADD COLUMN IF NOT EXISTS term_start_date date,
  ADD COLUMN IF NOT EXISTS term_end_date date;

CREATE TABLE IF NOT EXISTS public.timetable_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  override_date date NOT NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  start_time text NOT NULL,
  end_time text,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  venue_id uuid REFERENCES public.teaching_venues(id) ON DELETE SET NULL,
  room text,
  is_cancelled boolean NOT NULL DEFAULT false,
  reason text,
  academic_year text,
  term text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timetable_overrides_date ON public.timetable_overrides (override_date);
CREATE INDEX IF NOT EXISTS idx_timetable_overrides_class_date ON public.timetable_overrides (class_id, override_date);

ALTER TABLE public.timetable_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read timetable_overrides" ON public.timetable_overrides;
CREATE POLICY "Authenticated read timetable_overrides"
ON public.timetable_overrides FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage timetable_overrides" ON public.timetable_overrides;
CREATE POLICY "Admins manage timetable_overrides"
ON public.timetable_overrides FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'principal')
  OR public.has_role(auth.uid(), 'deputy_principal')
  OR public.has_role(auth.uid(), 'admin_supervisor')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'principal')
  OR public.has_role(auth.uid(), 'deputy_principal')
  OR public.has_role(auth.uid(), 'admin_supervisor')
);
