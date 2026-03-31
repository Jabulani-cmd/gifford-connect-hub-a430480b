
-- Table for admin-configurable timetable time slots
CREATE TABLE IF NOT EXISTS public.timetable_time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time text NOT NULL,
  end_time text NOT NULL,
  label text,
  slot_type text NOT NULL DEFAULT 'lesson',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(start_time, end_time)
);

ALTER TABLE public.timetable_time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage timetable_time_slots" ON public.timetable_time_slots FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated read timetable_time_slots" ON public.timetable_time_slots FOR SELECT TO authenticated USING (true);

-- Seed with default time slots
INSERT INTO public.timetable_time_slots (start_time, end_time, label, slot_type, display_order) VALUES
  ('07:30', '08:10', NULL, 'lesson', 1),
  ('08:10', '08:50', NULL, 'lesson', 2),
  ('08:50', '09:30', NULL, 'lesson', 3),
  ('09:30', '09:50', 'Break', 'break', 4),
  ('09:50', '10:30', NULL, 'lesson', 5),
  ('10:30', '11:10', NULL, 'lesson', 6),
  ('11:10', '11:50', NULL, 'lesson', 7),
  ('11:50', '12:30', NULL, 'lesson', 8),
  ('12:30', '13:10', NULL, 'lesson', 9),
  ('13:10', '13:50', 'Lunch', 'break', 10),
  ('13:50', '14:30', NULL, 'lesson', 11),
  ('14:30', '15:10', NULL, 'lesson', 12),
  ('15:10', '15:30', 'Break', 'break', 13),
  ('15:30', '16:10', NULL, 'sports', 14),
  ('16:10', '17:00', NULL, 'sports', 15)
ON CONFLICT DO NOTHING;
