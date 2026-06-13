ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id);