// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import FullWeekTimetable from "@/components/shared/FullWeekTimetable";

interface Props {
  studentClassId: string | null;
  studentId?: string | null;
}

export default function StudentTimetableTab({ studentClassId, studentId }: Props) {
  const [entries, setEntries] = useState<any[]>([]);
  const [sportsSchedule, setSportsSchedule] = useState<any[]>([]);
  const [sportsActivities, setSportsActivities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedClassId, setResolvedClassId] = useState<string | null | undefined>(undefined);

  // Resolve class ID from studentClassId prop or from student's form/stream
  useEffect(() => {
    let mounted = true;

    const resolveClassId = async () => {
      if (studentClassId) {
        if (mounted) setResolvedClassId(studentClassId);
        return;
      }

      if (!studentId) {
        if (mounted) setResolvedClassId(null);
        return;
      }

      // First try student_classes table
      const { data: sc } = await supabase
        .from("student_classes")
        .select("class_id")
        .eq("student_id", studentId)
        .limit(1)
        .maybeSingle();

      if (sc?.class_id) {
        if (mounted) setResolvedClassId(sc.class_id);
        return;
      }

      // Fallback: resolve from form/stream
      const { data: student } = await supabase
        .from("students")
        .select("form, stream")
        .eq("id", studentId)
        .maybeSingle();

      if (!student?.form) {
        if (mounted) setResolvedClassId(null);
        return;
      }

      let classId: string | null = null;

      if (student.stream) {
        const { data: exact } = await supabase
          .from("classes")
          .select("id")
          .eq("form_level", student.form)
          .eq("stream", student.stream)
          .limit(1)
          .maybeSingle();
        classId = exact?.id || null;
      }

      if (!classId) {
        const { data: fallback } = await supabase
          .from("classes")
          .select("id")
          .eq("form_level", student.form)
          .order("name")
          .limit(1)
          .maybeSingle();
        classId = fallback?.id || null;
      }

      if (mounted) setResolvedClassId(classId);
    };

    resolveClassId();
    return () => { mounted = false; };
  }, [studentClassId, studentId]);

  // Load timetable entries
  const loadTimetable = async () => {
    if (resolvedClassId === undefined) return;

    if (!resolvedClassId) {
      setEntries([]);
      setSportsSchedule([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [{ data: detailed }, { data: sports }] = await Promise.all([
      supabase
        .from("timetable_entries")
        .select("*, subjects(name), staff(full_name), classes(name)")
        .eq("class_id", resolvedClassId)
        .order("start_time"),
      supabase
        .from("sports_schedule")
        .select("*")
        .eq("class_id", resolvedClassId)
        .order("start_time"),
    ]);

    setEntries(detailed || []);
    setSportsSchedule(sports || []);
    setLoading(false);
  };

  useEffect(() => {
    loadTimetable();
  }, [resolvedClassId]);

  // Realtime subscription for timetable_entries changes
  useEffect(() => {
    if (!resolvedClassId) return;

    const channel = supabase
      .channel(`timetable-${resolvedClassId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "timetable_entries",
          filter: `class_id=eq.${resolvedClassId}`,
        },
        () => {
          loadTimetable();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sports_schedule",
          filter: `class_id=eq.${resolvedClassId}`,
        },
        () => {
          loadTimetable();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedClassId]);

  // Fetch sports activities
  useEffect(() => {
    let mounted = true;
    const fetchSports = async () => {
      if (!studentId) { if (mounted) setSportsActivities([]); return; }
      const { data } = await supabase
        .from("students")
        .select("sports_activities")
        .eq("id", studentId)
        .maybeSingle();
      if (mounted) setSportsActivities((data?.sports_activities as string[]) || []);
    };
    fetchSports();
    return () => { mounted = false; };
  }, [studentId]);

  return (
    <FullWeekTimetable
      entries={entries}
      sportsSchedule={sportsSchedule}
      sportsActivities={sportsActivities}
      loading={loading}
      hasClass={resolvedClassId !== null}
      noClassMessage="No class assignment found for this student yet."
    />
  );
}
