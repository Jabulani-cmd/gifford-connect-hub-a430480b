
-- Fix the FK on student_classes to reference students instead of auth.users
ALTER TABLE public.student_classes DROP CONSTRAINT student_classes_student_id_fkey;
ALTER TABLE public.student_classes ADD CONSTRAINT student_classes_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

-- Populate student_classes for existing active students
INSERT INTO student_classes (student_id, class_id)
SELECT s.id, c.id
FROM students s
JOIN classes c ON c.form_level = s.form AND c.stream = s.stream
WHERE s.status = 'active'
  AND s.form IS NOT NULL
  AND s.stream IS NOT NULL
ON CONFLICT (student_id, class_id) DO NOTHING;

-- Also populate enrollments for existing students
INSERT INTO enrollments (student_id, class_id, academic_year, enrollment_date)
SELECT s.id, c.id, to_char(now(), 'YYYY'), COALESCE(s.enrollment_date, CURRENT_DATE)
FROM students s
JOIN classes c ON c.form_level = s.form AND c.stream = s.stream
WHERE s.status = 'active'
  AND s.form IS NOT NULL
  AND s.stream IS NOT NULL
ON CONFLICT DO NOTHING;

-- Enable realtime on timetable_entries for live portal sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.timetable_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sports_schedule;
