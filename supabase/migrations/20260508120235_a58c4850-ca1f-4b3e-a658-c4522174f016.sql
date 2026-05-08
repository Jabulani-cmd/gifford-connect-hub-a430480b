
CREATE OR REPLACE FUNCTION public.auto_create_portal_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_enrollment_date date;
  v_trial_end date;
BEGIN
  SELECT enrollment_date INTO v_enrollment_date
  FROM students WHERE id = NEW.student_id;

  v_enrollment_date := COALESCE(v_enrollment_date, CURRENT_DATE);
  v_trial_end := v_enrollment_date + INTERVAL '3 months';

  INSERT INTO portal_subscriptions (student_id, parent_id, status, trial_end_date, payment_due_date, amount_usd)
  VALUES (
    NEW.student_id,
    NEW.parent_id,
    CASE WHEN CURRENT_DATE <= v_trial_end THEN 'free_trial' ELSE 'unpaid' END,
    v_trial_end,
    v_trial_end,
    25
  )
  ON CONFLICT (student_id, parent_id) DO NOTHING;

  RETURN NEW;
END;
$function$;
