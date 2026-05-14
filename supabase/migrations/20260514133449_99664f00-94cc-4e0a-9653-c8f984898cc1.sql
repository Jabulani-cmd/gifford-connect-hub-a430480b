
-- Teaching venues
CREATE TABLE IF NOT EXISTS public.teaching_venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  venue_type text NOT NULL DEFAULT 'classroom' CHECK (venue_type IN ('classroom','lab','hall','field','other')),
  capacity integer DEFAULT 40,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teaching_venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read venues" ON public.teaching_venues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage venues" ON public.teaching_venues FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal') OR has_role(auth.uid(),'deputy_principal') OR has_role(auth.uid(),'admin_supervisor'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal') OR has_role(auth.uid(),'deputy_principal') OR has_role(auth.uid(),'admin_supervisor'));

-- Subject period requirements per form
CREATE TABLE IF NOT EXISTS public.subject_period_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_level text NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  periods_per_week integer NOT NULL DEFAULT 5 CHECK (periods_per_week BETWEEN 1 AND 20),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (form_level, subject_id)
);
ALTER TABLE public.subject_period_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read period reqs" ON public.subject_period_requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage period reqs" ON public.subject_period_requirements FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal') OR has_role(auth.uid(),'deputy_principal') OR has_role(auth.uid(),'admin_supervisor'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal') OR has_role(auth.uid(),'deputy_principal') OR has_role(auth.uid(),'admin_supervisor'));

-- Drafts (class + exam)
CREATE TABLE IF NOT EXISTS public.timetable_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_type text NOT NULL CHECK (draft_type IN ('class','exam')),
  scope_id uuid,
  draft_json jsonb NOT NULL,
  meta jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.timetable_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage drafts" ON public.timetable_drafts FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal') OR has_role(auth.uid(),'deputy_principal') OR has_role(auth.uid(),'admin_supervisor'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal') OR has_role(auth.uid(),'deputy_principal') OR has_role(auth.uid(),'admin_supervisor'));

-- Optional venue link on existing tables (keep room/venue text columns)
ALTER TABLE public.timetable_entries ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.teaching_venues(id) ON DELETE SET NULL;
ALTER TABLE public.exam_timetable_entries ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.teaching_venues(id) ON DELETE SET NULL;
ALTER TABLE public.exam_timetable_entries ADD COLUMN IF NOT EXISTS invigilator_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;
