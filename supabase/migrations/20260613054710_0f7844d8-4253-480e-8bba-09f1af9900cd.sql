ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS max_periods_per_week integer DEFAULT 28;

ALTER TABLE public.class_subjects
  ADD COLUMN IF NOT EXISTS periods_per_week integer DEFAULT 4;