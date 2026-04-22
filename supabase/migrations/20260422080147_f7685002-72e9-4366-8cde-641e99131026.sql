-- Allow finance_clerk and bursar roles to manage finance tables (alongside admin & finance)

-- petty_cash
DROP POLICY IF EXISTS "Finance manage petty_cash" ON public.petty_cash;
CREATE POLICY "Finance manage petty_cash" ON public.petty_cash
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
);

-- bank_transactions
DROP POLICY IF EXISTS "Finance manage bank_transactions" ON public.bank_transactions;
CREATE POLICY "Finance manage bank_transactions" ON public.bank_transactions
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
);

-- expenses
DROP POLICY IF EXISTS "Finance manage expenses" ON public.expenses;
CREATE POLICY "Finance manage expenses" ON public.expenses
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
);

-- fee_structures
DROP POLICY IF EXISTS "Finance manage fee_structures" ON public.fee_structures;
CREATE POLICY "Finance manage fee_structures" ON public.fee_structures
FOR ALL USING (
  has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
) WITH CHECK (
  has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
);

-- invoice_items
DROP POLICY IF EXISTS "Finance manage invoice_items" ON public.invoice_items;
CREATE POLICY "Finance manage invoice_items" ON public.invoice_items
FOR ALL USING (
  has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
) WITH CHECK (
  has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
);

-- invoices
DROP POLICY IF EXISTS "Finance manage invoices" ON public.invoices;
CREATE POLICY "Finance manage invoices" ON public.invoices
FOR ALL USING (
  has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
) WITH CHECK (
  has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
);

-- payments
DROP POLICY IF EXISTS "Finance manage payments" ON public.payments;
CREATE POLICY "Finance manage payments" ON public.payments
FOR ALL USING (
  has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
) WITH CHECK (
  has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
);

-- supplier_invoices
DROP POLICY IF EXISTS "Finance manage supplier_invoices" ON public.supplier_invoices;
CREATE POLICY "Finance manage supplier_invoices" ON public.supplier_invoices
FOR ALL USING (
  has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
) WITH CHECK (
  has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
);

-- supplier_payments
DROP POLICY IF EXISTS "Finance manage supplier_payments" ON public.supplier_payments;
CREATE POLICY "Finance manage supplier_payments" ON public.supplier_payments
FOR ALL USING (
  has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
) WITH CHECK (
  has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
);

-- student_restrictions
DROP POLICY IF EXISTS "Finance manage student_restrictions" ON public.student_restrictions;
CREATE POLICY "Finance manage student_restrictions" ON public.student_restrictions
FOR ALL USING (
  has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
) WITH CHECK (
  has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
);

-- students (read)
DROP POLICY IF EXISTS "Finance read students" ON public.students;
CREATE POLICY "Finance read students" ON public.students
FOR SELECT USING (
  has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'finance_clerk'::app_role)
  OR has_role(auth.uid(), 'bursar'::app_role)
);