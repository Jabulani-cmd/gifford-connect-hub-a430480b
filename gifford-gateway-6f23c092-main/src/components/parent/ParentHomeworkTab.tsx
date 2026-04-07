// @ts-nocheck
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { format, isPast, isThisMonth, isThisWeek, isToday, differenceInDays } from "date-fns";
import { BookOpen, CheckCircle2, ClipboardList, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

type TimeFilter = "today" | "week" | "month" | "all";

interface Props {
  studentId: string;
}

export default function ParentHomeworkTab({ studentId }: Props) {
  const [studentClassId, setStudentClassId] = useState<string | null>(null);
  const [homework, setHomework] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("week");

  useEffect(() => {
    if (!studentId) return;
    fetchData();
  }, [studentId]);

  const fetchData = async () => {
    setLoading(true);

    const { data: classLink } = await supabase
      .from("student_classes")
      .select("class_id")
      .eq("student_id", studentId)
      .limit(1)
      .maybeSingle();

    let resolvedClassId = classLink?.class_id || null;

    if (!resolvedClassId) {
      const { data: student } = await supabase
        .from("students")
        .select("form, stream")
        .eq("id", studentId)
        .maybeSingle();

      if (student?.form) {
        const { data: fallbackClass } = await supabase
          .from("classes")
          .select("id")
          .eq("form_level", student.form)
          .eq("stream", student.stream || "")
          .limit(1)
          .maybeSingle();

        resolvedClassId = fallbackClass?.id || null;

        if (!resolvedClassId) {
          const { data: formOnlyClass } = await supabase
            .from("classes")
            .select("id")
            .eq("form_level", student.form)
            .limit(1)
            .maybeSingle();

          resolvedClassId = formOnlyClass?.id || null;
        }
      }
    }

    setStudentClassId(resolvedClassId);

    if (!resolvedClassId) {
      setHomework([]);
      setAssessments([]);
      setSubmissions([]);
      setResults([]);
      setLoading(false);
      return;
    }

    const [{ data: hw }, { data: assess }, { data: subs }, { data: res }] = await Promise.all([
      supabase
        .from("homework")
        .select("*, subjects(name), classes(name)")
        .eq("class_id", resolvedClassId)
        .order("due_date", { ascending: true }),
      supabase
        .from("assessments")
        .select("*, subjects(name), classes(name)")
        .eq("is_published", true)
        .eq("class_id", resolvedClassId)
        .order("due_date", { ascending: true }),
      supabase
        .from("assessment_submissions")
        .select("*")
        .eq("student_id", studentId),
      supabase
        .from("assessment_results")
        .select("*")
        .eq("student_id", studentId)
        .eq("is_published", true),
    ]);

    setHomework(hw || []);
    setAssessments(assess || []);
    setSubmissions(subs || []);
    setResults(res || []);
    setLoading(false);
  };

  const getSubmission = (assessmentId: string) => submissions.find((item) => item.assessment_id === assessmentId);
  const getResult = (assessmentId: string) => results.find((item) => item.assessment_id === assessmentId);

  const matchesTimeFilter = (dateValue: string | null) => {
    if (!dateValue) return timeFilter === "all";
    const date = new Date(dateValue);
    if (timeFilter === "today") return isToday(date);
    if (timeFilter === "week") return isThisWeek(date, { weekStartsOn: 1 });
    if (timeFilter === "month") return isThisMonth(date);
    return true;
  };

  const filteredHomework = useMemo(() => homework.filter((item) => matchesTimeFilter(item.due_date)), [homework, timeFilter]);
  const filteredAssessments = useMemo(() => assessments.filter((item) => matchesTimeFilter(item.due_date)), [assessments, timeFilter]);

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>;
  }

  if (!studentClassId) {
    return <EmptyState icon={<BookOpen className="h-10 w-10" />} text="No class linked yet" sub="Homework and assignments will appear once the child is linked to a class." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { id: "today", label: "Today" },
          { id: "week", label: "This Week" },
          { id: "month", label: "This Month" },
          { id: "all", label: "All" },
        ].map((filter) => (
          <button
            key={filter.id}
            onClick={() => setTimeFilter(filter.id as TimeFilter)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              timeFilter === filter.id
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <Tabs defaultValue="homework">
        <TabsList className="w-full">
          <TabsTrigger value="homework" className="flex-1 text-xs">Homework ({filteredHomework.length})</TabsTrigger>
          <TabsTrigger value="assignments" className="flex-1 text-xs">Assignments ({filteredAssessments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="homework" className="mt-3 space-y-2">
          {filteredHomework.length === 0 ? (
            <EmptyState icon={<CheckCircle2 className="h-10 w-10" />} text="No homework found" sub={getFilterEmptyText(timeFilter, "homework")} />
          ) : (
            filteredHomework.map((item) => {
              const isOverdue = item.due_date && isPast(new Date(item.due_date));
              const daysLeft = item.due_date ? differenceInDays(new Date(item.due_date), new Date()) : null;

              return (
                <Card key={item.id} className={isOverdue ? "border-destructive/30" : undefined}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.subjects?.name || "Subject"}</p>
                        {item.description && <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>}
                        {item.due_date && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span className={isOverdue ? "text-destructive font-medium" : undefined}>
                              {formatDueLabel(daysLeft, isOverdue)} · {format(new Date(item.due_date), "EEE, MMM d")}
                            </span>
                          </div>
                        )}
                      </div>
                      <Badge variant={isOverdue ? "destructive" : "outline"}>{isOverdue ? "Overdue" : "Pending"}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="assignments" className="mt-3 space-y-2">
          {filteredAssessments.length === 0 ? (
            <EmptyState icon={<ClipboardList className="h-10 w-10" />} text="No assignments found" sub={getFilterEmptyText(timeFilter, "assignments")} />
          ) : (
            filteredAssessments.map((item) => {
              const submission = getSubmission(item.id);
              const result = getResult(item.id);
              const isOverdue = item.due_date && isPast(new Date(item.due_date));
              const daysLeft = item.due_date ? differenceInDays(new Date(item.due_date), new Date()) : null;

              return (
                <Card key={item.id} className={isOverdue && !submission && !result ? "border-destructive/30" : undefined}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{item.title}</p>
                          <Badge variant="outline" className="text-[10px]">{item.assessment_type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.subjects?.name || "Subject"}</p>
                        {item.instructions && <p className="mt-2 text-sm text-muted-foreground">{item.instructions}</p>}
                        {item.due_date && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span className={isOverdue && !submission && !result ? "text-destructive font-medium" : undefined}>
                              {formatDueLabel(daysLeft, isOverdue)} · {format(new Date(item.due_date), "EEE, MMM d")}
                            </span>
                          </div>
                        )}
                        {result && (
                          <p className="mt-2 text-sm font-medium text-foreground">
                            Result: {result.marks_obtained ?? "—"}/{item.max_marks ?? "—"} {result.grade ? `(${result.grade})` : ""}
                          </p>
                        )}
                      </div>
                      {result ? (
                        <Badge className="border-secondary/20 bg-secondary/10 text-secondary hover:bg-secondary/10">Graded</Badge>
                      ) : submission ? (
                        <Badge className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">Submitted</Badge>
                      ) : isOverdue ? (
                        <Badge variant="destructive">Not Submitted</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatDueLabel(daysLeft: number | null, isOverdue: boolean) {
  if (isOverdue) return "Overdue";
  if (daysLeft === 0) return "Due today";
  if (daysLeft === 1) return "Due tomorrow";
  return `${daysLeft} days left`;
}

function getFilterEmptyText(filter: TimeFilter, itemType: string) {
  if (filter === "today") return `No ${itemType} for today.`;
  if (filter === "week") return `No ${itemType} for this week.`;
  if (filter === "month") return `No ${itemType} for this month.`;
  return `No ${itemType} found.`;
}

function EmptyState({ icon, text, sub }: { icon: ReactNode; text: string; sub: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <div className="mx-auto mb-3 text-muted-foreground/40">{icon}</div>
        <p className="text-sm font-medium text-muted-foreground">{text}</p>
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
