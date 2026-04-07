// @ts-nocheck
import { useState, useEffect, useMemo, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CheckCircle2, ClipboardList, Eye, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { format, isPast, differenceInDays } from "date-fns";

interface Props {
  studentId: string;
}

export default function ParentAssessmentsTab({ studentId }: Props) {
  const [studentClassId, setStudentClassId] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    fetchData();
  }, [studentId]);

  const fetchData = async () => {
    setLoading(true);

    // Resolve class
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
        const { data: cls } = await supabase
          .from("classes")
          .select("id")
          .eq("form_level", student.form)
          .limit(1)
          .maybeSingle();
        resolvedClassId = cls?.id || null;
      }
    }

    setStudentClassId(resolvedClassId);

    if (!resolvedClassId) {
      setAssessments([]);
      setSubmissions([]);
      setResults([]);
      setLoading(false);
      return;
    }

    const [{ data: assess }, { data: subs }, { data: res }] = await Promise.all([
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
        .select("*, assessments(title, max_marks, subjects(name))")
        .eq("student_id", studentId)
        .eq("is_published", true),
    ]);

    setAssessments(assess || []);
    setSubmissions(subs || []);
    setResults(res || []);
    setLoading(false);
  };

  const getSubmission = (assessmentId: string) =>
    submissions.find((s) => s.assessment_id === assessmentId);
  const getResult = (assessmentId: string) =>
    results.find((r) => r.assessment_id === assessmentId);

  const upcoming = useMemo(() =>
    assessments.filter((a) => a.due_date && !isPast(new Date(a.due_date)) && !getResult(a.id)),
    [assessments, results]
  );
  const pastDue = useMemo(() =>
    assessments.filter((a) => a.due_date && isPast(new Date(a.due_date)) && !getSubmission(a.id) && !getResult(a.id)),
    [assessments, submissions, results]
  );
  const completed = useMemo(() =>
    assessments.filter((a) => getResult(a.id) || getSubmission(a.id)),
    [assessments, submissions, results]
  );

  const gradeColor = (grade: string) => {
    if (grade === "A" || grade === "A*") return "text-green-600";
    if (grade === "B") return "text-blue-600";
    if (grade === "C") return "text-yellow-600";
    return "text-muted-foreground";
  };

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>;
  }

  if (!studentClassId) {
    return <EmptyState icon={<ClipboardList className="h-10 w-10" />} text="No class linked yet" sub="Assessments will appear once the child is linked to a class." />;
  }

  const renderCard = (a: any, showDue = true) => {
    const sub = getSubmission(a.id);
    const res = getResult(a.id);
    const daysLeft = a.due_date ? differenceInDays(new Date(a.due_date), new Date()) : null;
    const isOverdue = a.due_date && isPast(new Date(a.due_date));

    return (
      <Card key={a.id} className={isOverdue && !sub && !res ? "border-destructive/30" : ""}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold">{a.title}</p>
                <Badge variant="outline" className="text-[10px]">{a.assessment_type}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{a.subjects?.name}</p>
              {showDue && a.due_date && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
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
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-sm font-bold ${gradeColor(res.grade || "")}`}>
                    {res.marks_obtained}/{a.max_marks} ({res.grade})
                  </span>
                  {res.teacher_feedback && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">— {res.teacher_feedback}</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              {res ? (
                <button
                  onClick={() => { setSelectedAssessment(a); setSelectedResult(res); setShowResult(true); }}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  <Eye className="h-3 w-3" /> View
                </button>
              ) : sub ? (
                <Badge className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/10 text-[10px]">Submitted</Badge>
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
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="upcoming">
        <TabsList className="w-full">
          <TabsTrigger value="upcoming" className="flex-1 text-xs">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="pastdue" className="flex-1 text-xs">Past Due ({pastDue.length})</TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 text-xs">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-2 mt-3">
          {upcoming.length === 0 ? (
            <EmptyState icon={<CheckCircle2 className="h-10 w-10" />} text="No upcoming assessments" sub="Your child is all caught up!" />
          ) : upcoming.map((a) => renderCard(a))}
        </TabsContent>

        <TabsContent value="pastdue" className="space-y-2 mt-3">
          {pastDue.length === 0 ? (
            <EmptyState icon={<CheckCircle2 className="h-10 w-10" />} text="No overdue assessments" sub="Great job staying on track!" />
          ) : pastDue.map((a) => renderCard(a))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-2 mt-3">
          {completed.length === 0 ? (
            <EmptyState icon={<ClipboardList className="h-10 w-10" />} text="No completed assessments yet" sub="Results will appear here after grading." />
          ) : completed.map((a) => renderCard(a, false))}
        </TabsContent>
      </Tabs>

      {/* Result Detail Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Results: {selectedAssessment?.title}</DialogTitle>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className={`text-4xl font-bold ${gradeColor(selectedResult.grade || "")}`}>
                  {selectedResult.grade || "—"}
                </p>
                <p className="text-lg font-medium mt-1">
                  {selectedResult.marks_obtained} / {selectedAssessment?.max_marks}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedResult.percentage?.toFixed(1)}%
                </p>
              </div>
              {selectedResult.teacher_feedback && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Teacher Feedback</p>
                  <p className="text-sm">{selectedResult.teacher_feedback}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
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
