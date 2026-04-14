
-- Allow parents to delete their own pending portal_payments
-- Parents own payments through subscriptions they own
CREATE POLICY "Parents can delete their own pending payments"
ON public.portal_payments
FOR DELETE
USING (
  status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.portal_subscriptions ps
    WHERE ps.id = portal_payments.subscription_id
      AND ps.parent_id = auth.uid()
  )
);

-- Also allow deleting pending paynow_transactions they own
CREATE POLICY "Parents can delete their own pending transactions"
ON public.paynow_transactions
FOR DELETE
USING (
  status = 'pending'
  AND parent_id = auth.uid()
);
