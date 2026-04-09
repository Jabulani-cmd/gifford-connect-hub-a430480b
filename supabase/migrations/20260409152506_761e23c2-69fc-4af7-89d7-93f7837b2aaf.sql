
-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  billing_cycle TEXT NOT NULL, -- 'monthly', 'termly', 'yearly'
  price_usd NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  features TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

-- Insert default plans
INSERT INTO public.subscription_plans (name, billing_cycle, price_usd, description, features, is_popular) VALUES
  ('Monthly', 'monthly', 5, 'Pay monthly for flexible access', ARRAY['Full portal access', 'Real-time notifications', 'Academic reports', 'Fee statements', 'Cancel anytime'], false),
  ('Termly', 'termly', 10, 'Best value per term — most popular', ARRAY['Full portal access', 'Real-time notifications', 'Academic reports', 'Fee statements', 'Priority support', 'Save 33% vs monthly'], true),
  ('Yearly', 'yearly', 25, 'Best annual rate — save the most', ARRAY['Full portal access', 'Real-time notifications', 'Academic reports', 'Fee statements', 'Priority support', 'Save 58% vs monthly'], false);

-- Add plan columns to portal_subscriptions
ALTER TABLE public.portal_subscriptions
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'termly',
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.subscription_plans(id);
