
CREATE TABLE public.paynow_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  poll_url text,
  browser_url text,
  payment_type text NOT NULL CHECK (payment_type IN ('subscription', 'fees', 'donation')),
  subscription_id uuid REFERENCES public.portal_subscriptions(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  parent_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'usd' CHECK (currency IN ('usd', 'zig')),
  method text NOT NULL DEFAULT 'web' CHECK (method IN ('ecocash', 'onemoney', 'web')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  paynow_reference text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.paynow_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own transactions"
  ON public.paynow_transactions FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Admins can manage all transactions"
  ON public.paynow_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
