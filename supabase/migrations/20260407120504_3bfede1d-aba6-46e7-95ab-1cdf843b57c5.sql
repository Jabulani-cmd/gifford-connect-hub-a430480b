
-- Portal Subscriptions table
CREATE TABLE public.portal_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'free_trial' CHECK (status IN ('free_trial', 'active', 'expired', 'unpaid')),
  trial_end_date date NOT NULL,
  payment_due_date date,
  last_payment_date timestamp with time zone,
  stripe_customer_id text,
  stripe_subscription_id text,
  amount_usd numeric NOT NULL DEFAULT 10,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (student_id, parent_id)
);

-- Portal Payments table
CREATE TABLE public.portal_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.portal_subscriptions(id) ON DELETE CASCADE,
  amount_usd numeric NOT NULL DEFAULT 10,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portal_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_payments ENABLE ROW LEVEL SECURITY;

-- RLS for portal_subscriptions
CREATE POLICY "Parents can view their own subscriptions"
  ON public.portal_subscriptions FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions"
  ON public.portal_subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage subscriptions"
  ON public.portal_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS for portal_payments
CREATE POLICY "Parents can view their own payments"
  ON public.portal_payments FOR SELECT TO authenticated
  USING (
    subscription_id IN (
      SELECT id FROM public.portal_subscriptions WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all portal payments"
  ON public.portal_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to auto-create subscriptions when parent links to student
CREATE OR REPLACE FUNCTION public.auto_create_portal_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_enrollment_date date;
  v_trial_end date;
BEGIN
  -- Get student enrollment date
  SELECT enrollment_date INTO v_enrollment_date
  FROM students WHERE id = NEW.student_id;

  -- Default to now if no enrollment date
  v_enrollment_date := COALESCE(v_enrollment_date, CURRENT_DATE);
  
  -- Trial = 3 months from enrollment
  v_trial_end := v_enrollment_date + INTERVAL '3 months';

  -- Create subscription if not exists
  INSERT INTO portal_subscriptions (student_id, parent_id, status, trial_end_date, payment_due_date, amount_usd)
  VALUES (
    NEW.student_id,
    NEW.parent_id,
    CASE WHEN CURRENT_DATE <= v_trial_end THEN 'free_trial' ELSE 'unpaid' END,
    v_trial_end,
    v_trial_end,
    10
  )
  ON CONFLICT (student_id, parent_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_portal_subscription
AFTER INSERT ON public.parent_students
FOR EACH ROW EXECUTE FUNCTION public.auto_create_portal_subscription();

-- Function to check portal access
CREATE OR REPLACE FUNCTION public.check_portal_access(_user_id uuid, _role text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_sub RECORD;
  v_has_access boolean := false;
  v_reason text := '';
  v_trial_end date;
BEGIN
  IF _role = 'parent' THEN
    -- Check if any child has active subscription or free trial
    SELECT INTO v_sub *
    FROM portal_subscriptions
    WHERE parent_id = _user_id
    ORDER BY
      CASE status
        WHEN 'active' THEN 1
        WHEN 'free_trial' THEN 2
        ELSE 3
      END
    LIMIT 1;

    IF v_sub IS NULL THEN
      -- No subscription at all - check if any linked students
      IF EXISTS (SELECT 1 FROM parent_students WHERE parent_id = _user_id) THEN
        RETURN jsonb_build_object('has_access', false, 'reason', 'no_subscription', 'trial_end_date', null);
      ELSE
        RETURN jsonb_build_object('has_access', true, 'reason', 'no_children_linked', 'trial_end_date', null);
      END IF;
    END IF;

    IF v_sub.status = 'active' THEN
      v_has_access := true;
      v_reason := 'active_subscription';
    ELSIF v_sub.status = 'free_trial' AND CURRENT_DATE <= v_sub.trial_end_date THEN
      v_has_access := true;
      v_reason := 'free_trial';
    ELSE
      v_has_access := false;
      v_reason := 'subscription_expired';
    END IF;

    RETURN jsonb_build_object(
      'has_access', v_has_access,
      'reason', v_reason,
      'trial_end_date', v_sub.trial_end_date,
      'status', v_sub.status,
      'subscription_id', v_sub.id
    );

  ELSIF _role = 'student' THEN
    -- Student has access if: trial active OR parent has active subscription
    SELECT s.enrollment_date INTO v_trial_end
    FROM students s WHERE s.user_id = _user_id;

    IF v_trial_end IS NOT NULL AND CURRENT_DATE <= (v_trial_end + INTERVAL '3 months')::date THEN
      RETURN jsonb_build_object('has_access', true, 'reason', 'free_trial', 'trial_end_date', (v_trial_end + INTERVAL '3 months')::date);
    END IF;

    -- Check if any parent has active subscription for this student
    IF EXISTS (
      SELECT 1 FROM portal_subscriptions ps
      JOIN students s ON ps.student_id = s.id
      WHERE s.user_id = _user_id
        AND (ps.status = 'active' OR (ps.status = 'free_trial' AND CURRENT_DATE <= ps.trial_end_date))
    ) THEN
      RETURN jsonb_build_object('has_access', true, 'reason', 'parent_subscription');
    END IF;

    RETURN jsonb_build_object('has_access', false, 'reason', 'no_active_subscription');
  END IF;

  -- Other roles always have access
  RETURN jsonb_build_object('has_access', true, 'reason', 'non_gated_role');
END;
$$;
