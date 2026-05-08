
-- 1. De-duplicate any existing duplicate auto-graded results before adding constraints
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY assessment_id, student_id ORDER BY created_at DESC NULLS LAST, id DESC) AS rn
  FROM public.assessment_results
)
DELETE FROM public.assessment_results
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Unique constraint so we can upsert
ALTER TABLE public.assessment_results
  DROP CONSTRAINT IF EXISTS assessment_results_assessment_student_unique;
ALTER TABLE public.assessment_results
  ADD CONSTRAINT assessment_results_assessment_student_unique
  UNIQUE (assessment_id, student_id);

-- 3. Add an assessment_id column on marks (nullable) so we can dedupe per assessment, plus partial unique index
ALTER TABLE public.marks
  ADD COLUMN IF NOT EXISTS assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS marks_unique_per_assessment
  ON public.marks (student_id, assessment_id)
  WHERE assessment_id IS NOT NULL;

-- 4. Updated sync function: upsert results and marks, then notify student + linked parents
CREATE OR REPLACE FUNCTION public.sync_online_test_marks(
  p_student_id uuid,
  p_assessment_id uuid,
  p_subject_id uuid,
  p_teacher_id uuid,
  p_score integer,
  p_total_marks integer,
  p_percentage numeric,
  p_grade text,
  p_title text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_term text;
  v_month integer;
  v_resolved_teacher_id uuid;
  v_student_user_id uuid;
  v_parent RECORD;
  v_msg text;
BEGIN
  v_month := EXTRACT(MONTH FROM now());
  IF v_month BETWEEN 1 AND 4 THEN v_term := 'Term 1';
  ELSIF v_month BETWEEN 5 AND 8 THEN v_term := 'Term 2';
  ELSE v_term := 'Term 3';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE id = p_teacher_id) THEN
    v_resolved_teacher_id := p_teacher_id;
  ELSE
    SELECT user_id INTO v_resolved_teacher_id FROM public.staff WHERE id = p_teacher_id;
    IF v_resolved_teacher_id IS NULL THEN
      v_resolved_teacher_id := p_teacher_id;
    END IF;
  END IF;

  -- Upsert mark (unique per student+assessment)
  INSERT INTO public.marks (student_id, subject_id, teacher_id, mark, assessment_type, description, comment, term, assessment_id)
  VALUES (p_student_id, p_subject_id, v_resolved_teacher_id, ROUND(p_percentage), 'online_test', p_title,
          'Auto-graded: ' || p_score || '/' || p_total_marks, v_term, p_assessment_id)
  ON CONFLICT (student_id, assessment_id) WHERE assessment_id IS NOT NULL
  DO UPDATE SET
    mark = EXCLUDED.mark,
    subject_id = EXCLUDED.subject_id,
    teacher_id = EXCLUDED.teacher_id,
    description = EXCLUDED.description,
    comment = EXCLUDED.comment,
    term = EXCLUDED.term;

  -- Upsert assessment result (auto-published)
  INSERT INTO public.assessment_results (assessment_id, student_id, marks_obtained, percentage, grade, teacher_feedback, graded_date, is_published)
  VALUES (p_assessment_id, p_student_id, p_score, p_percentage, p_grade,
          'Auto-graded online test: ' || p_score || '/' || p_total_marks, now(), true)
  ON CONFLICT (assessment_id, student_id)
  DO UPDATE SET
    marks_obtained = EXCLUDED.marks_obtained,
    percentage = EXCLUDED.percentage,
    grade = EXCLUDED.grade,
    teacher_feedback = EXCLUDED.teacher_feedback,
    graded_date = EXCLUDED.graded_date,
    is_published = true;

  v_msg := 'Your "' || p_title || '" was auto-graded: ' || p_score || '/' || p_total_marks || ' (' || p_grade || ').';

  -- Notify student
  SELECT user_id INTO v_student_user_id FROM public.students WHERE id = p_student_id;
  IF v_student_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (v_student_user_id, 'Test Result Available', v_msg, 'assessment_result');
  END IF;

  -- Notify linked parents
  FOR v_parent IN
    SELECT parent_id FROM public.parent_students WHERE student_id = p_student_id
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (v_parent.parent_id, 'Child Test Result', v_msg, 'assessment_result');
  END LOOP;

  -- Notify the teacher (so they see submissions instantly)
  IF v_resolved_teacher_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (v_resolved_teacher_id, 'Online Test Auto-Graded',
            'A student submitted "' || p_title || '" — auto-graded ' || p_score || '/' || p_total_marks || '.',
            'assessment_result');
  END IF;
END;
$$;

-- 5. Realtime: ensure changes propagate live to all portals
ALTER TABLE public.assessment_results REPLICA IDENTITY FULL;
ALTER TABLE public.marks REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.assessment_results;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.marks;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
