// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOfflineSection } from "@/hooks/useOfflineSection";
import OfflineStatusBadge from "@/components/offline/OfflineStatusBadge";
import FullWeekTimetable from "@/components/shared/FullWeekTimetable";

interface Props {
  studentClassId: string | null;
  studentId?: string | null;
}

export default function StudentTimetableTab({ studentClassId, studentId }: Props) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [sportsSchedule, setSportsSchedule] = useState<any[]>([]);
  const [sportsActivities, setSportsActivities] = useState<string[]>([]);
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

  const offline = useOfflineSection<{
    entries: any[];
    sports: any[];
    sportsActivities: string[];
  }>({
    section: `student.timetable.${resolvedClassId ?? "no-class"}`,
    userId: user?.id ?? studentId,
    deps: [resolvedClassId, studentId],
    fetcher: async () => {
      if (resolvedClassId === undefined) {
        return { entries: [], sports: [], sportsActivities: [] };
      }
      if (!resolvedClassId) {
        const empty = { entries: [], sports: [], sportsActivities: [] };
        setEntries([]);
        setSportsSchedule([]);
        return empty;
      }
      const [{ data: detailed }, { data: sports }, sportsAct] = await Promise.all([
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
        studentId
          ? supabase.from("students").select("sports_activities").eq("id", studentId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const payload = {
        entries: detailed || [],
        sports: sports || [],
        sportsActivities: (sportsAct?.data?.sports_activities as string[]) || [],
      };
      setEntries(payload.entries);
      setSportsSchedule(payload.sports);
      setSportsActivities(payload.sportsActivities);
      return payload;
    },
    restore: (cached) => {
      setEntries(cached?.entries || []);
      setSportsSchedule(cached?.sports || []);
      setSportsActivities(cached?.sportsActivities || []);
    },
  });

  // Realtime subscription for live updates when online
  useEffect(() => {
    if (!resolvedClassId || !offline.online) return;
    const channel = supabase
      .channel(`timetable-${resolvedClassId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "timetable_entries", filter: `class_id=eq.${resolvedClassId}` },
        () => offline.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sports_schedule", filter: `class_id=eq.${resolvedClassId}` },
        () => offline.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedClassId, offline.online]);

  return (
    <div className="space-y-3">
      <OfflineStatusBadge {...offline} />
      <FullWeekTimetable
        entries={entries}
        sportsSchedule={sportsSchedule}
        sportsActivities={sportsActivities}
        loading={offline.loading}
        hasClass={resolvedClassId !== null}
        noClassMessage="No class assignment found for this student yet."
      />
    </div>
  );
}
