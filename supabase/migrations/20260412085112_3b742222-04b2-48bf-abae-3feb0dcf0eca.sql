
-- Online test questions for assessments
CREATE TABLE public.assessment_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_answer TEXT NOT NULL,
  marks NUMERIC DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own assessment questions" ON public.assessment_questions
  FOR ALL TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      WHERE a.teacher_id IN (SELECT s.id FROM staff s WHERE s.user_id = auth.uid())
         OR a.teacher_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'principal'::app_role)
  )
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      WHERE a.teacher_id IN (SELECT s.id FROM staff s WHERE s.user_id = auth.uid())
         OR a.teacher_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'principal'::app_role)
  );

CREATE POLICY "Students view questions for published assessments" ON public.assessment_questions
  FOR SELECT TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a WHERE a.is_published = true
    )
  );

-- Student test attempts
CREATE TABLE public.assessment_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '{}'::jsonb,
  score NUMERIC DEFAULT 0,
  total_marks NUMERIC DEFAULT 0,
  percentage NUMERIC DEFAULT 0,
  grade TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  is_submitted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own attempts" ON public.assessment_attempts
  FOR ALL TO authenticated
  USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  )
  WITH CHECK (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Teachers view attempts for own assessments" ON public.assessment_attempts
  FOR SELECT TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      WHERE a.teacher_id IN (SELECT s.id FROM staff s WHERE s.user_id = auth.uid())
         OR a.teacher_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'principal'::app_role)
  );

CREATE POLICY "Parents view child attempts" ON public.assessment_attempts
  FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT ps.student_id FROM parent_students ps WHERE ps.parent_id = auth.uid())
  );

-- Add is_online flag to assessments to distinguish online tests
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS link_url TEXT;

-- Storage policy: allow students to upload assessment submission files
CREATE POLICY "Students upload assessment submissions"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'school-media'
    AND split_part(name, '/', 1) = 'submissions'
    AND split_part(name, '/', 2) = auth.uid()::text
  );

-- Enable realtime for attempts
ALTER PUBLICATION supabase_realtime ADD TABLE public.assessment_attempts;
