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
  studentName?: string | null;
}

export default function StudentTimetableTab({ studentClassId, studentId, studentName }: Props) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [sportsSchedule, setSportsSchedule] = useState<any[]>([]);
  const [sportsActivities, setSportsActivities] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [termStart, setTermStart] = useState<string | null>(null);
  const [termEnd, setTermEnd] = useState<string | null>(null);
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
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: detailed }, { data: sports }, sportsAct, { data: classSubjects }, { data: ovs }] = await Promise.all([
        supabase
          .from("timetable_entries")
          .select("*, subjects(name), classes(name)")
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
        supabase
          .from("class_subjects")
          .select("subject_id, teacher_id")
          .eq("class_id", resolvedClassId),
        supabase
          .from("timetable_overrides")
          .select("*, subjects(name), staff(full_name)")
          .or(`class_id.eq.${resolvedClassId},class_id.is.null`)
          .gte("override_date", today),
      ]);

      const staffIds = Array.from(new Set([
        ...(detailed || []).map((entry: any) => entry.teacher_id),
        ...(classSubjects || []).map((assignment: any) => assignment.teacher_id),
        ...(sports || []).map((entry: any) => entry.coach_id),
      ].filter(Boolean)));
      const { data: staffNames } = staffIds.length > 0
        ? await supabase.rpc("get_public_staff_names", { _staff_ids: staffIds })
        : { data: [] };
      const staffById = new Map<string, { full_name: string }>();
      (staffNames || []).forEach((staff: any) => {
        if (staff.id && staff.full_name) {
          staffById.set(staff.id, { full_name: staff.full_name });
        }
      });
      const teacherBySubject = new Map<string, { full_name: string }>();
      (classSubjects || []).forEach((cs: any) => {
        const assignedTeacher = cs.teacher_id ? staffById.get(cs.teacher_id) : null;
        if (cs.subject_id && assignedTeacher?.full_name) {
          teacherBySubject.set(cs.subject_id, assignedTeacher);
        }
      });
      const enrichedEntries = (detailed || []).map((e: any) => ({
        ...e,
        staff:
          (e.teacher_id ? staffById.get(e.teacher_id) : null) ||
          (e.subject_id ? teacherBySubject.get(e.subject_id) : null) ||
          null,
      }));
      const enrichedSports = (sports || []).map((s: any) => ({
        ...s,
        staff: s.coach_id ? staffById.get(s.coach_id) || null : null,
      }));
      const first = (detailed || [])[0];
      const payload = {
        entries: enrichedEntries,
        sports: enrichedSports,
        sportsActivities: (sportsAct?.data?.sports_activities as string[]) || [],
        overrides: ovs || [],
        termStart: first?.term_start_date || null,
        termEnd: first?.term_end_date || null,
      };
      setEntries(payload.entries);
      setSportsSchedule(payload.sports);
      setSportsActivities(payload.sportsActivities);
      setOverrides(payload.overrides);
      setTermStart(payload.termStart);
      setTermEnd(payload.termEnd);
      return payload;
    },
    restore: (cached) => {
      setEntries(cached?.entries || []);
      setSportsSchedule(cached?.sports || []);
      setSportsActivities(cached?.sportsActivities || []);
      setOverrides(cached?.overrides || []);
      setTermStart(cached?.termStart || null);
      setTermEnd(cached?.termEnd || null);
    },
  });

  // Realtime subscription for live updates when online
  useEffect(() => {
    if (!resolvedClassId || !offline.online) return;
    // Subscribe without class_id filter so deletes (which may not carry the
    // filter column) and bulk admin rebuilds always trigger a refresh.
    const channel = supabase
      .channel(`timetable-watch-${resolvedClassId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "timetable_entries" },
        () => offline.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sports_schedule" },
        () => offline.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "timetable_overrides" },
        () => offline.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedClassId, offline.online, offline.refresh]);

  // Refresh when the tab/window regains focus so parents/students always see
  // the latest admin edits even if a realtime event was missed.
  useEffect(() => {
    if (!resolvedClassId) return;
    const onFocus = () => {
      if (document.visibilityState === "visible") offline.refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [resolvedClassId, offline.refresh]);

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
        title="Class Timetable"
        printTitle={studentName ? `Timetable — ${studentName}` : "Class Timetable"}
        termStartDate={termStart}
        termEndDate={termEnd}
        overrides={overrides}
      />
    </div>
  );
}
      />
    </div>
  );
}
