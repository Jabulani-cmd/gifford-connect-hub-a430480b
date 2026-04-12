// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, Clock, CheckCircle2, Upload, FileText, Eye, Download, ExternalLink, PenTool } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isPast, differenceInDays } from "date-fns";
import OnlineTestTaker from "./OnlineTestTaker";

interface Props {
  studentId: string | null; // student table ID
  studentClassId: string | null;
  userId: string;
}

export default function StudentAssessmentsTab({ studentId, studentClassId, userId }: Props) {
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [takingTest, setTakingTest] = useState<any>(null);
  const [submitComment, setSubmitComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [submitFile, setSubmitFile] = useState<File | null>(null);

  useEffect(() => {
    if (studentClassId && studentId) {
      fetchAll();
    } else {
      setLoading(false);
    }
  }, [studentClassId, studentId]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: assess }, { data: subs }, { data: res }, { data: atts }] = await Promise.all([
      supabase
        .from("assessments")
        .select("*, subjects(name), classes(name)")
        .eq("is_published", true)
        .eq("class_id", studentClassId!)
        .order("due_date", { ascending: true }),
      supabase.from("assessment_submissions").select("*").eq("student_id", studentId!),
      supabase
        .from("assessment_results")
        .select("*, assessments(title, max_marks, subjects(name))")
        .eq("student_id", studentId!)
        .eq("is_published", true),
      supabase
        .from("assessment_attempts")
        .select("*")
        .eq("student_id", studentId!)
        .eq("is_submitted", true),
    ]);
    setAssessments(assess || []);
    setSubmissions(subs || []);
    setResults(res || []);
    setAttempts(atts || []);
    setLoading(false);
  };

  const getSubmission = (assessmentId: string) => submissions.find((s) => s.assessment_id === assessmentId);
  const getResult = (assessmentId: string) => results.find((r) => r.assessment_id === assessmentId);
  const getAttempt = (assessmentId: string) => attempts.find((a) => a.assessment_id === assessmentId);
  const hasOnlineQuestions = async (assessmentId: string) => {
    const { count } = await supabase
      .from("assessment_questions")
      .select("*", { count: "exact", head: true })
      .eq("assessment_id", assessmentId);
    return (count || 0) > 0;
  };

  const upcoming = assessments.filter((a) => a.due_date && !isPast(new Date(a.due_date)) && !getResult(a.id) && !getAttempt(a.id));
  const pastDue = assessments.filter(
    (a) => a.due_date && isPast(new Date(a.due_date)) && !getSubmission(a.id) && !getResult(a.id) && !getAttempt(a.id),
  );
  const completed = assessments.filter((a) => getResult(a.id) || getSubmission(a.id) || getAttempt(a.id));

  const handleSubmit = async () => {
    if (!selectedAssessment || !studentId) return;
    setSubmitting(true);

    let fileUrl: string | null = null;
    if (submitFile) {
      const path = `submissions/${userId}/${Date.now()}-${submitFile.name}`;
      const { error } = await supabase.storage.from("school-media").upload(path, submitFile);
      if (!error) {
        fileUrl = supabase.storage.from("school-media").getPublicUrl(path).data.publicUrl;
      }
    }

    const { error } = await supabase.from("assessment_submissions").insert({
      assessment_id: selectedAssessment.id,
      student_id: studentId,
      file_url: fileUrl,
      comments: submitComment || null,
      status: "submitted",
      submission_date: new Date().toISOString(),
    });

    if (error) {
      toast({ title: "Error submitting", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Assignment submitted!" });
      setShowSubmit(false);
      setSubmitComment("");
      setSubmitFile(null);
      fetchAll();
    }
    setSubmitting(false);
  };

  const startOnlineTest = async (a: any) => {
    const hasQs = await hasOnlineQuestions(a.id);
    if (!hasQs) {
      toast({ title: "This online test has no questions yet", variant: "destructive" });
      return;
    }
    setTakingTest(a);
  };

  const gradeColor = (grade: string) => {
    if (grade === "A" || grade === "A*") return "text-green-600";
    if (grade === "B") return "text-blue-600";
    if (grade === "C") return "text-yellow-600";
    return "text-muted-foreground";
  };

  // Online test view
  if (takingTest && studentId) {
    return (
      <OnlineTestTaker
        assessment={takingTest}
        studentId={studentId}
        onBack={() => setTakingTest(null)}
        onComplete={fetchAll}
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  const renderAssessmentCard = (a: any, showDue = true) => {
    const sub = getSubmission(a.id);
    const res = getResult(a.id);
    const att = getAttempt(a.id);
    // Compare dates using date-only (strip time) to avoid off-by-one issues
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDate = a.due_date ? new Date(a.due_date) : null;
    const dueDateStart = dueDate ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()) : null;
    const daysLeft = dueDateStart ? differenceInDays(dueDateStart, todayStart) : null;
    const isOverdue = daysLeft !== null && daysLeft < 0;
    const hasFile = a.file_url && a.file_url.trim() !== "";
    const isOnline = a.is_online || a.assessment_type === "online_test";

    return (
      <Card key={a.id} className={isOverdue && !sub && !res && !att ? "border-destructive/30" : ""}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {isOnline ? <PenTool className="h-4 w-4 text-primary shrink-0" /> : hasFile ? <FileText className="h-4 w-4 text-muted-foreground shrink-0" /> : null}
                <p className="text-sm font-medium">{a.title}</p>
                <Badge variant="outline" className="text-[10px]">
                  {isOnline ? "Online Test" : a.assessment_type}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{a.subjects?.name}</p>
              {showDue && a.due_date && (
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className={`text-[11px] ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {isOverdue ? "Overdue" : daysLeft === 0 ? "Due today" : daysLeft === 1 ? "Due tomorrow" : `${daysLeft} days left`}
                    {" · "}{format(new Date(a.due_date), "MMM d")}
                  </span>
                </div>
              )}
              {(res || att) && (
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-sm font-bold ${gradeColor((res?.grade || att?.grade) || "")}`}>
                    {res ? `${res.marks_obtained}/${a.max_marks} (${res.grade})` : att ? `${att.score}/${att.total_marks} (${att.grade})` : ""}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {hasFile && (
                <>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => window.open(a.file_url, "_blank")}>
                    <ExternalLink className="h-3 w-3 mr-1" /> Open
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => window.open(a.file_url, "_blank")}>
                    <Download className="h-3 w-3 mr-1" /> Download
                  </Button>
                </>
              )}
              {isOnline && !att && !res && (
                <Button size="sm" className="text-xs h-7" onClick={() => startOnlineTest(a)}>
                  <PenTool className="h-3 w-3 mr-1" /> Take Test
                </Button>
              )}
              {isOnline && att && (
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setTakingTest(a); }}>
                  <Eye className="h-3 w-3 mr-1" /> View Result
                </Button>
              )}
              {!isOnline && !sub && !res && (
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setSelectedAssessment(a); setShowSubmit(true); }}>
                  <Upload className="h-3 w-3 mr-1" /> Submit
                </Button>
              )}
              {res && !att && (
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setSelectedAssessment(a); setShowResult(true); }}>
                  <Eye className="h-3 w-3 mr-1" /> Result
                </Button>
              )}
              {sub && !res && !att && <Badge className="text-[10px] bg-green-100 text-green-700">Submitted</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const selectedResult = selectedAssessment ? getResult(selectedAssessment.id) : null;

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
            <EmptyState icon={<CheckCircle2 className="h-10 w-10" />} text="No upcoming assessments" sub="You're all caught up!" />
          ) : upcoming.map((a) => renderAssessmentCard(a))}
        </TabsContent>

        <TabsContent value="pastdue" className="space-y-2 mt-3">
          {pastDue.length === 0 ? (
            <EmptyState icon={<CheckCircle2 className="h-10 w-10" />} text="No overdue assessments" sub="Great job staying on track!" />
          ) : pastDue.map((a) => renderAssessmentCard(a))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-2 mt-3">
          {completed.length === 0 ? (
            <EmptyState icon={<ClipboardList className="h-10 w-10" />} text="No completed assessments yet" sub="Results will appear here after grading." />
          ) : completed.map((a) => renderAssessmentCard(a, false))}
        </TabsContent>
      </Tabs>

      {/* Submit Dialog */}
      <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Submit: {selectedAssessment?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedAssessment?.instructions && (
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">{selectedAssessment.instructions}</p>
            )}
            <div>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3 w-3 mr-1" /> {submitFile ? submitFile.name : "Attach File"}
              </Button>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => setSubmitFile(e.target.files?.[0] || null)} />
            </div>
            <Textarea placeholder="Add comments (optional)..." value={submitComment} onChange={(e) => setSubmitComment(e.target.value)} rows={3} />
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? "Submitting..." : "Submit Assignment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
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
                <p className="text-lg font-medium mt-1">{selectedResult.marks_obtained} / {selectedAssessment?.max_marks}</p>
                <p className="text-sm text-muted-foreground">{selectedResult.percentage?.toFixed(1)}%</p>
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
