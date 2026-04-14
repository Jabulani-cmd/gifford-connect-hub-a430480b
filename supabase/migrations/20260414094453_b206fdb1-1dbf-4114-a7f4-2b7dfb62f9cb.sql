
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
BEGIN
  -- Determine current term
  v_month := EXTRACT(MONTH FROM now());
  IF v_month BETWEEN 1 AND 4 THEN v_term := 'Term 1';
  ELSIF v_month BETWEEN 5 AND 8 THEN v_term := 'Term 2';
  ELSE v_term := 'Term 3';
  END IF;

  -- Resolve teacher_id: if it's a staff ID, get the auth user_id
  -- marks.teacher_id references auth.users(id), but assessments may store staff.id
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = p_teacher_id) THEN
    v_resolved_teacher_id := p_teacher_id;
  ELSE
    SELECT user_id INTO v_resolved_teacher_id FROM public.staff WHERE id = p_teacher_id;
    IF v_resolved_teacher_id IS NULL THEN
      v_resolved_teacher_id := p_teacher_id; -- fallback
    END IF;
  END IF;

  -- Insert into marks table (visible across all portals)
  INSERT INTO public.marks (student_id, subject_id, teacher_id, mark, assessment_type, description, comment, term)
  VALUES (p_student_id, p_subject_id, v_resolved_teacher_id, ROUND(p_percentage), 'online_test', p_title, 'Auto-graded: ' || p_score || '/' || p_total_marks, v_term)
  ON CONFLICT DO NOTHING;

  -- Insert into assessment_results (for teacher grading view)
  INSERT INTO public.assessment_results (assessment_id, student_id, marks_obtained, percentage, grade, teacher_feedback, graded_date, is_published)
  VALUES (p_assessment_id, p_student_id, p_score, p_percentage, p_grade, 'Auto-graded online test: ' || p_score || '/' || p_total_marks, now(), true)
  ON CONFLICT DO NOTHING;
END;
$$;
