UPDATE public.subscription_plans SET price_usd = 10 WHERE billing_cycle = 'monthly';
UPDATE public.subscription_plans SET price_usd = 25 WHERE billing_cycle = 'termly';
UPDATE public.subscription_plans SET price_usd = 60 WHERE billing_cycle = 'yearly';