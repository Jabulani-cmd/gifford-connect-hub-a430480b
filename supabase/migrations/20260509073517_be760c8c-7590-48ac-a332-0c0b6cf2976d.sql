ALTER TABLE public.timetable_entries REPLICA IDENTITY FULL;
ALTER TABLE public.sports_schedule REPLICA IDENTITY FULL;
ALTER TABLE public.class_subjects REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'class_subjects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.class_subjects;
  END IF;
END $$;