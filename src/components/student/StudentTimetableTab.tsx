// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const shortDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];

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

  const today = new Date().getDay(); // 0=Sun, 1=Mon...
  const [selectedDay, setSelectedDay] = useState(today >= 1 && today <= 5 ? today : 1);

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

    return () => {
      mounted = false;
    };
  }, [studentClassId, studentId]);

  useEffect(() => {
    let mounted = true;

    const fetchTimetable = async (classId: string) => {
      const { data: detailed } = await supabase
        .from("timetable_entries")
        .select("*, subjects(name), staff(full_name), classes(name)")
        .eq("class_id", classId)
        .order("start_time");

      if (detailed && detailed.length > 0) {
        return detailed;
      }

      const { data: basic } = await supabase
        .from("timetable")
        .select("*, subjects(name)")
        .eq("class_id", classId)
        .order("time_slot");

      return basic || [];
    };

    const fetchSportsSchedule = async (classId: string) => {
      const { data } = await supabase
        .from("sports_schedule")
        .select("*")
        .eq("class_id", classId)
        .order("start_time");

      return data || [];
    };

    const load = async () => {
      if (resolvedClassId === undefined) return;

      if (!resolvedClassId) {
        if (!mounted) return;
        setEntries([]);
        setSportsSchedule([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const [academic, sports] = await Promise.all([
        fetchTimetable(resolvedClassId),
        fetchSportsSchedule(resolvedClassId),
      ]);

      if (!mounted) return;
      setEntries(academic);
      setSportsSchedule(sports);
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [resolvedClassId]);

  useEffect(() => {
    let mounted = true;

    const fetchSports = async () => {
      if (!studentId) {
        if (mounted) setSportsActivities([]);
        return;
      }

      const { data } = await supabase
        .from("students")
        .select("sports_activities")
        .eq("id", studentId)
        .maybeSingle();

      if (!mounted) return;
      setSportsActivities((data?.sports_activities as string[]) || []);
    };

    fetchSports();

    return () => {
      mounted = false;
    };
  }, [studentId]);

  const dayEntries = useMemo(
    () => entries.filter((e) => e.day_of_week === selectedDay - 1 || e.day_of_week === selectedDay),
    [entries, selectedDay],
  );

  const daySports = useMemo(
    () => sportsSchedule.filter((e) => e.day_of_week === selectedDay - 1 || e.day_of_week === selectedDay),
    [sportsSchedule, selectedDay],
  );

  const isDetailed = entries.length > 0 && entries[0].start_time;

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div>;
  }

  if (!resolvedClassId) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No class assignment found for this student yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[1, 2, 3, 4, 5].map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className={`flex-1 min-w-[56px] rounded-lg py-2.5 text-center text-xs font-medium transition-colors ${
              selectedDay === d
                ? "bg-secondary text-secondary-foreground"
                : today === d
                  ? "border border-secondary/30 bg-secondary/10 text-secondary"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {shortDays[d - 1]}
            {today === d && <span className="mt-0.5 block text-[9px]">Today</span>}
          </button>
        ))}
      </div>

      {dayEntries.length === 0 && daySports.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No activities scheduled for {dayNames[selectedDay - 1]}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {dayEntries.map((e, i) => (
            <Card key={e.id || i}>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="min-w-[50px] text-center">
                  <span className="text-xs font-bold text-foreground">{isDetailed ? e.start_time : e.time_slot}</span>
                  {isDetailed && e.end_time && <span className="block text-[10px] text-muted-foreground">{e.end_time}</span>}
                </div>
                <div className="h-10 w-0.5 rounded-full bg-secondary/30" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{e.subjects?.name || "Free Period"}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    {e.staff?.full_name && <span className="text-[11px] text-muted-foreground">{e.staff.full_name}</span>}
                    {e.room && (
                      <Badge variant="outline" className="px-1.5 py-0 text-[9px]">
                        {e.room}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {daySports.map((e, i) => (
            <Card key={e.id || `sport-${i}`}>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="min-w-[50px] text-center">
                  <span className="text-xs font-bold text-foreground">{e.start_time}</span>
                  <span className="block text-[10px] text-muted-foreground">{e.end_time}</span>
                </div>
                <div className="h-10 w-0.5 rounded-full bg-secondary/30" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{e.activity_name || "Sports & Club"}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    {e.venue && <span className="text-[11px] text-muted-foreground">{e.venue}</span>}
                    <Badge variant="secondary" className="text-[9px]">
                      Sports/Club
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {sportsActivities.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-secondary" />
            <h3 className="text-sm font-semibold text-foreground">Sports & Activities</h3>
          </div>
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-2">
                {sportsActivities.map((sport) => (
                  <Badge key={sport} variant="secondary" className="text-xs">
                    {sport}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
