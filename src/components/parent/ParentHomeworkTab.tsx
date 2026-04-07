// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CheckCircle2, BookOpen, ClipboardList, FileText, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isThisWeek, isThisMonth, isPast, differenceInDays } from "date-fns";

interface Props {
  studentId: string;
  studentClassId: string | null;
  studentName: string;
}

export default function ParentHomeworkTab({ studentId, studentClassId, studentName }: Props) {
  const [homework, setHomework] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("week");

  useEffect(() => {
    if (studentId && studentClassId) {
      fetchAll();
    } else {
      setLoading(false);
    }
  }, [studentId, studentClassId]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: hw }, { data: assess }, { data: subs }, { data: res }] = await Promise.all([
      supabase
        .from("homework")
        .select("*, subjects(name)")
        .eq("class_id", studentClassId!)
        .order("due_date", { ascending: true }),
      supabase
        .from("assessments")
        .select("*, subjects(name)")
        .eq("is_published", true)
        .eq("class_id", studentClassId!)
        .order("due_date", { ascending: true }),
      supabase
        .from("assessment_submissions")
        .select("*")
        .eq("student_id", studentId),
      supabase
        .from("assessment_results")
        .select("*, assessments(title, max_marks)")
        .eq("student_id", studentId)
        .eq("is_published", true),
    ]);
    setHomework(hw || []);
    setAssessments(assess || []);
    setSubmissions(subs || []);
    setResults(res || []);
    setLoading(false);
  };

  const getSubmission = (id: string) => submissions.find((s) => s.assessment_id === id);
  const getResult = (id: string) => results.find((r) => r.assessment_id === id);

  const filterByTime = (date: string | null) => {
    if (!date) return timeFilter === "all";
    const d = new Date(date);
    if (timeFilter === "today") return isToday(d);
    if (timeFilter === "week") return isThisWeek(d, { weekStartsOn: 1 });
    if (timeFilter === "month") return isThisMonth(d);
    return true;
  };

  const filteredHomework = homework.filter((h) => filterByTime(h.due_date));
  const filteredAssessments = assessments.filter((a) => filterByTime(a.due_date));

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Time filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "today", label: "Today" },
          { id: "week", label: "This Week" },
          { id: "month", label: "This Month" },
          { id: "all", label: "All" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setTimeFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              timeFilter === f.id
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Tabs defaultValue="homework">
        <TabsList className="w-full">
          <TabsTrigger value="homework" className="flex-1 text-xs">
            <BookOpen className="h-3.5 w-3.5 mr-1" />
            Homework ({filteredHomework.length})
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex-1 text-xs">
            <ClipboardList className="h-3.5 w-3.5 mr-1" />
            Assignments ({filteredAssessments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="homework" className="space-y-2 mt-3">
          {filteredHomework.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-10 w-10" />}
              text="No homework found"
              sub={`No homework for ${timeFilter === "today" ? "today" : timeFilter === "week" ? "this week" : timeFilter === "month" ? "this month" : "any period"}.`}
            />
          ) : (
            filteredHomework.map((h) => {
              const isOverdue = h.due_date && isPast(new Date(h.due_date));
              const daysLeft = h.due_date ? differenceInDays(new Date(h.due_date), new Date()) : null;
              return (
                <Card key={h.id} className={isOverdue ? "border-destructive/30" : ""}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{h.title}</p>
                        <p className="text-[11px] text-muted-foreground">{h.subjects?.name}</p>
                        {h.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{h.description}</p>
                        )}
                        {h.due_date && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className={`text-[11px] ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                              {isOverdue
                                ? "Overdue"
                                : daysLeft === 0
                                  ? "Due today"
                                  : daysLeft === 1
                                    ? "Due tomorrow"
                                    : `${daysLeft} days left`}
                              {" · "}
                              {format(new Date(h.due_date), "EEE, MMM d")}
                            </span>
                          </div>
                        )}
                      </div>
                      <Badge variant={isOverdue ? "destructive" : "outline"} className="text-[10px] shrink-0">
                        {isOverdue ? "Overdue" : "Pending"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-2 mt-3">
          {filteredAssessments.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-10 w-10" />}
              text="No assignments found"
              sub={`No assignments for ${timeFilter === "today" ? "today" : timeFilter === "week" ? "this week" : timeFilter === "month" ? "this month" : "any period"}.`}
            />
          ) : (
            filteredAssessments.map((a) => {
              const sub = getSubmission(a.id);
              const res = getResult(a.id);
              const isOverdue = a.due_date && isPast(new Date(a.due_date));
              const daysLeft = a.due_date ? differenceInDays(new Date(a.due_date), new Date()) : null;

              return (
                <Card key={a.id} className={isOverdue && !sub && !res ? "border-destructive/30" : ""}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{a.title}</p>
                          <Badge variant="outline" className="text-[10px]">{a.assessment_type}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{a.subjects?.name}</p>
                        {a.instructions && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.instructions}</p>
                        )}
                        {a.due_date && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className={`text-[11px] ${isOverdue && !sub && !res ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                              {isOverdue
                                ? "Overdue"
                                : daysLeft === 0
                                  ? "Due today"
                                  : daysLeft === 1
                                    ? "Due tomorrow"
                                    : `${daysLeft} days left`}
                              {" · "}
                              {format(new Date(a.due_date), "EEE, MMM d")}
                            </span>
                          </div>
                        )}
                        {res && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-sm font-bold ${
                              res.grade === "A" ? "text-green-600" :
                              res.grade === "B" ? "text-blue-600" :
                              res.grade === "C" ? "text-yellow-600" :
                              "text-muted-foreground"
                            }`}>
                              {res.marks_obtained}/{a.max_marks} ({res.grade})
                            </span>
                            {res.teacher_feedback && (
                              <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                                — {res.teacher_feedback}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        {res ? (
                          <Badge className="text-[10px] bg-green-100 text-green-700">Graded</Badge>
                        ) : sub ? (
                          <Badge className="text-[10px] bg-blue-100 text-blue-700">Submitted</Badge>
                        ) : isOverdue ? (
                          <Badge variant="destructive" className="text-[10px]">Not Submitted</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Pending</Badge>
                        )}
                      </div>
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

function EmptyState({ icon, text, sub }: { icon: React.ReactNode; text: string; sub: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <div className="mx-auto mb-3 text-muted-foreground/40">{icon}</div>
        <p className="text-sm font-medium text-muted-foreground">{text}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}
