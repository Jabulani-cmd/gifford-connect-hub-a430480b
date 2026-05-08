
CREATE OR REPLACE FUNCTION public.log_assessment_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_name text;
  v_subject_name text;
  v_published boolean := false;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_published = true THEN
    v_published := true;
  ELSIF TG_OP = 'UPDATE' AND COALESCE(OLD.is_published, false) = false AND NEW.is_published = true THEN
    v_published := true;
  END IF;

  IF NOT v_published THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_class_name FROM public.classes WHERE id = NEW.class_id;
  SELECT name INTO v_subject_name FROM public.subjects WHERE id = NEW.subject_id;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (
    auth.uid(),
    'assessment_published',
    'assessments',
    NEW.id,
    jsonb_build_object(
      'title', NEW.title,
      'assessment_type', NEW.assessment_type,
      'class_id', NEW.class_id,
      'class_name', v_class_name,
      'subject_id', NEW.subject_id,
      'subject_name', v_subject_name,
      'max_marks', NEW.max_marks,
      'due_date', NEW.due_date,
      'published_at', now()
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_assessment_publish ON public.assessments;
CREATE TRIGGER trg_log_assessment_publish
AFTER INSERT OR UPDATE OF is_published ON public.assessments
FOR EACH ROW EXECUTE FUNCTION public.log_assessment_publish();
