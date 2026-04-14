// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Upload, ClipboardList, Eye, Trash2, ChevronRight, ChevronLeft, Download,
  FileText, CheckCircle2, Clock, AlertCircle, Users, Link as LinkIcon, ExternalLink, PenTool, Bot, Loader2, BookOpen, Sparkles, Copy, Printer
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import OnlineTestBuilder from "./OnlineTestBuilder";

const assessmentTypes = ["online_test", "test", "exam", "assignment", "quiz", "project"];
const typeLabels: Record<string, string> = {
  online_test: "📝 Online MCQ Test",
  test: "Test",
  exam: "Exam",
  assignment: "Assignment",
  quiz: "Quiz",
  project: "Project",
};

function zimGrade(pct: number): string {
  if (pct >= 90) return "A*";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  if (pct >= 40) return "E";
  return "U";
}

interface Props {
  teacherId: string;
  teacherIds: string[];
  classes: any[];
  subjects: any[];
  students: any[];
}

export default function AssessmentsTab({ teacherId, teacherIds, classes, subjects, students }: Props) {
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [onlineTestAssessment, setOnlineTestAssessment] = useState<any | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<any | null>(null);
  const [gradingStudentIdx, setGradingStudentIdx] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);

  // Create form
  const [form, setForm] = useState({
    title: "", assessment_type: "test", class_id: "", subject_id: "",
    max_marks: "100", due_date: "", instructions: "", is_published: true, link_url: "",
    time_limit_minutes: "", scheduled_start: "", scheduled_end: ""
  });
  const [formFile, setFormFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const memoFileRef = useRef<HTMLInputElement>(null);
  const [formMemoFile, setFormMemoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // AI Marking state
  const [aiMarking, setAiMarking] = useState(false);
  const [aiMarkingSubId, setAiMarkingSubId] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiResultDialog, setAiResultDialog] = useState(false);

  // Memo upload for existing assessment
  const [uploadingMemo, setUploadingMemo] = useState(false);

  // Grading form
  const [gradeForm, setGradeForm] = useState({ marks: "", feedback: "" });
  const [gradeLoading, setGradeLoading] = useState(false);

  // Filter
  const [filterClass, setFilterClass] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchAssessments();

    // Realtime subscription for new submissions
    const channel = supabase
      .channel('teacher-submissions')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'assessment_submissions',
      }, () => {
        fetchAssessments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAssessments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("assessments")
      .select("*")
      .in("teacher_id", teacherIds)
      .order("created_at", { ascending: false });
    if (data) {
      setAssessments(data);
      // Fetch all submissions for this teacher's assessments
      const assessmentIds = data.map((a: any) => a.id);
      if (assessmentIds.length > 0) {
        const { data: allSubs } = await supabase
          .from("assessment_submissions")
          .select("*, students(full_name, admission_number), assessments(title, class_id, subject_id)")
          .in("assessment_id", assessmentIds)
          .order("created_at", { ascending: false });
        setAllSubmissions(allSubs || []);
      }
    }
    setLoading(false);
  };

  const createAssessment = async () => {
    if (!form.title || !form.class_id || !form.subject_id) {
      toast({ title: "Fill required fields", variant: "destructive" }); return;
    }
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    const authUid = user?.id || teacherId;

    let file_url = null;
    if (formFile) {
      const ext = formFile.name.split(".").pop();
      const path = `assessments/${authUid}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("school-media").upload(path, formFile);
      if (upErr) { toast({ title: "Upload failed", description: upErr.message, variant: "destructive" }); setSubmitting(false); return; }
      file_url = supabase.storage.from("school-media").getPublicUrl(path).data.publicUrl;
    }

    let memo_url = null;
    if (formMemoFile) {
      const ext = formMemoFile.name.split(".").pop();
      const path = `assessments/${authUid}/memos/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("school-media").upload(path, formMemoFile);
      if (upErr) { toast({ title: "Memo upload failed", description: upErr.message, variant: "destructive" }); setSubmitting(false); return; }
      memo_url = supabase.storage.from("school-media").getPublicUrl(path).data.publicUrl;
    }

    const { error } = await supabase.from("assessments").insert({
      teacher_id: teacherId,
      title: form.title,
      assessment_type: form.assessment_type,
      class_id: form.class_id,
      subject_id: form.subject_id,
      max_marks: parseFloat(form.max_marks) || 100,
      due_date: form.due_date || null,
      instructions: form.instructions || null,
      file_url,
      memo_url,
      link_url: form.link_url || null,
      is_published: form.is_published,
      is_online: form.assessment_type === "online_test",
      time_limit_minutes: form.time_limit_minutes ? parseInt(form.time_limit_minutes) : null,
      scheduled_start: form.scheduled_start ? new Date(form.scheduled_start).toISOString() : null,
      scheduled_end: form.scheduled_end ? new Date(form.scheduled_end).toISOString() : null,
    } as any);

    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      const isOnline = form.assessment_type === "online_test";
      const savedTitle = form.title;
      toast({ title: isOnline ? "Online test created! Now add your MCQ questions." : "Assessment created!" });
      setForm({ title: "", assessment_type: "test", class_id: "", subject_id: "", max_marks: "100", due_date: "", instructions: "", is_published: true, link_url: "", time_limit_minutes: "", scheduled_start: "", scheduled_end: "" });
      setFormFile(null);
      setFormMemoFile(null);
      setCreating(false);
      await fetchAssessments();
      // Auto-open question builder for online tests
      if (isOnline) {
        const { data: latest } = await supabase.from("assessments").select("*").eq("teacher_id", teacherId).eq("title", savedTitle).eq("is_online", true).order("created_at", { ascending: false }).limit(1).single();
        if (latest) setOnlineTestAssessment(latest);
      }
    }
    setSubmitting(false);
  };

  // Upload memo for existing assessment
  const uploadMemoForAssessment = async (file: File) => {
    if (!selectedAssessment) return;
    setUploadingMemo(true);
    const { data: { user } } = await supabase.auth.getUser();
    const authUid = user?.id || teacherId;
    const ext = file.name.split(".").pop();
    const path = `assessments/${authUid}/memos/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("school-media").upload(path, file);
    if (upErr) { toast({ title: "Memo upload failed", description: upErr.message, variant: "destructive" }); setUploadingMemo(false); return; }
    const memo_url = supabase.storage.from("school-media").getPublicUrl(path).data.publicUrl;
    await supabase.from("assessments").update({ memo_url } as any).eq("id", selectedAssessment.id);
    setSelectedAssessment({ ...selectedAssessment, memo_url });
    toast({ title: "Marking guide uploaded successfully!" });
    setUploadingMemo(false);
  };

  // AI Mark submission
  const aiMarkSubmission = async (submissionId: string) => {
    if (!selectedAssessment) return;
    if (!selectedAssessment.memo_url) {
      toast({ title: "Upload a marking guide first", description: "Please upload the memo/answer key before using AI marking.", variant: "destructive" });
      return;
    }
    setAiMarking(true);
    setAiMarkingSubId(submissionId);
    try {
      const { data, error } = await supabase.functions.invoke("ai-mark-submission", {
        body: { submission_id: submissionId, assessment_id: selectedAssessment.id },
      });
      if (error) throw error;
      if (data?.error) { toast({ title: "AI Marking Error", description: data.error, variant: "destructive" }); setAiMarking(false); setAiMarkingSubId(null); return; }
      setAiResult(data);
      setAiResultDialog(true);
    } catch (e: any) {
      toast({ title: "AI marking failed", description: e.message || "Please try again", variant: "destructive" });
    }
    setAiMarking(false);
    // Don't clear aiMarkingSubId here - needed by the result dialog
  };

  // Apply AI marks to student and sync across all portals
  const applyAiMarks = async (submissionId: string) => {
    if (!aiResult || !selectedAssessment) return;
    const sub = submissions.find(s => s.id === submissionId);
    if (!sub) return;
    const existing = results.find(r => r.student_id === sub.student_id);
    if (existing) {
      await supabase.from("assessment_results").update({
        marks_obtained: aiResult.marks_obtained, percentage: aiResult.percentage, grade: aiResult.grade,
        teacher_feedback: `[AI-Marked] ${aiResult.feedback}`,
        graded_by: teacherId, graded_date: new Date().toISOString(), is_published: true,
      }).eq("id", existing.id);
    } else {
      await supabase.from("assessment_results").insert({
        assessment_id: selectedAssessment.id, student_id: sub.student_id,
        marks_obtained: aiResult.marks_obtained, percentage: aiResult.percentage, grade: aiResult.grade,
        teacher_feedback: `[AI-Marked] ${aiResult.feedback}`,
        graded_by: teacherId, graded_date: new Date().toISOString(), is_published: true,
      });
    }

    // Sync to master marks table so it's visible on student & parent portals
    if (selectedAssessment.subject_id) {
      await supabase.rpc("sync_online_test_marks", {
        p_student_id: sub.student_id,
        p_assessment_id: selectedAssessment.id,
        p_subject_id: selectedAssessment.subject_id,
        p_teacher_id: teacherId,
        p_score: Math.round(aiResult.marks_obtained),
        p_total_marks: selectedAssessment.max_marks || 100,
        p_percentage: aiResult.percentage,
        p_grade: aiResult.grade,
        p_title: `[AI] ${selectedAssessment.title}`,
      });
    }

    // Send notification to student
    if (sub.students?.full_name) {
      const studentRecord = students.find(s => s.id === sub.student_id);
      if (studentRecord?.user_id) {
        await supabase.from("notifications").insert({
          user_id: studentRecord.user_id,
          title: "Assessment Graded",
          message: `Your submission for "${selectedAssessment.title}" has been graded: ${aiResult.grade} (${aiResult.marks_obtained}/${selectedAssessment.max_marks})`,
          type: "assessment",
        });
      }
    }

    const { data } = await supabase.from("assessment_results").select("*, students(full_name, admission_number)").eq("assessment_id", selectedAssessment.id);
    if (data) setResults(data);
    toast({ title: `AI Grade applied & synced: ${aiResult.grade} (${aiResult.marks_obtained}/${selectedAssessment.max_marks})` });
    setAiResultDialog(false);
    setAiResult(null);
  };

  const deleteAssessment = async (id: string) => {
    await supabase.from("assessments").delete().eq("id", id);
    setAssessments(prev => prev.filter(a => a.id !== id));
    if (selectedAssessment?.id === id) setSelectedAssessment(null);
    toast({ title: "Assessment deleted" });
  };

  const openAssessmentDetail = async (assessment: any) => {
    setSelectedAssessment(assessment);
    setGradingStudentIdx(0);

    // Fetch submissions and results
    const [{ data: subs }, { data: res }] = await Promise.all([
      supabase.from("assessment_submissions").select("*, students(full_name, admission_number)").eq("assessment_id", assessment.id),
      supabase.from("assessment_results").select("*, students(full_name, admission_number)").eq("assessment_id", assessment.id),
    ]);
    setSubmissions(subs || []);
    setResults(res || []);
  };

  // Get students for the selected assessment's class
  const classStudents = selectedAssessment
    ? students.filter(s => {
        const cls = classes.find(c => c.id === selectedAssessment.class_id);
        if (!cls) return false;
        if (s.form !== cls.form_level) return false;
        if (!cls.stream || !s.stream) return true;
        return s.stream === cls.stream || `${s.form}${s.stream}` === cls.name || s.stream === cls.name;
      })
    : [];

  const currentStudent = classStudents[gradingStudentIdx];
  const currentResult = currentStudent ? results.find(r => r.student_id === currentStudent.id) : null;

  useEffect(() => {
    if (currentResult) {
      setGradeForm({ marks: String(currentResult.marks_obtained || ""), feedback: currentResult.teacher_feedback || "" });
    } else {
      setGradeForm({ marks: "", feedback: "" });
    }
  }, [gradingStudentIdx, selectedAssessment, results]);

  const saveGrade = async () => {
    if (!currentStudent || !selectedAssessment || !gradeForm.marks) return;
    setGradeLoading(true);
    const maxMarks = selectedAssessment.max_marks || 100;
    const marksObtained = parseFloat(gradeForm.marks);
    const pct = (marksObtained / maxMarks) * 100;
    const grade = zimGrade(pct);

    if (currentResult) {
      await supabase.from("assessment_results").update({
        marks_obtained: marksObtained, percentage: pct, grade,
        teacher_feedback: gradeForm.feedback || null,
        graded_by: teacherId, graded_date: new Date().toISOString(),
      }).eq("id", currentResult.id);
    } else {
      await supabase.from("assessment_results").insert({
        assessment_id: selectedAssessment.id, student_id: currentStudent.id,
        marks_obtained: marksObtained, percentage: pct, grade,
        teacher_feedback: gradeForm.feedback || null,
        graded_by: teacherId, graded_date: new Date().toISOString(),
      });
    }

    // Sync to master marks table for cross-portal visibility
    if (selectedAssessment.subject_id) {
      await supabase.rpc("sync_online_test_marks", {
        p_student_id: currentStudent.id,
        p_assessment_id: selectedAssessment.id,
        p_subject_id: selectedAssessment.subject_id,
        p_teacher_id: teacherId,
        p_score: Math.round(marksObtained),
        p_total_marks: maxMarks,
        p_percentage: pct,
        p_grade: grade,
        p_title: selectedAssessment.title,
      });
    }

    // Notify student
    if (currentStudent.user_id) {
      await supabase.from("notifications").insert({
        user_id: currentStudent.user_id,
        title: "Assessment Graded",
        message: `Your "${selectedAssessment.title}" has been graded: ${grade} (${marksObtained}/${maxMarks})`,
        type: "assessment",
      });
    }

    // Refresh results
    const { data } = await supabase.from("assessment_results").select("*, students(full_name, admission_number)").eq("assessment_id", selectedAssessment.id);
    if (data) setResults(data);

    toast({ title: `Grade saved & synced: ${grade} (${pct.toFixed(0)}%)` });
    setGradeLoading(false);

    // Auto-advance
    if (gradingStudentIdx < classStudents.length - 1) setGradingStudentIdx(prev => prev + 1);
  };

  const publishResults = async () => {
    if (!selectedAssessment) return;
    await supabase.from("assessment_results").update({ is_published: true }).eq("assessment_id", selectedAssessment.id);
    toast({ title: "Results published! Students can now view their grades." });
    const { data } = await supabase.from("assessment_results").select("*, students(full_name, admission_number)").eq("assessment_id", selectedAssessment.id);
    if (data) setResults(data);
  };

  const filteredAssessments = assessments.filter(a => {
    if (filterClass !== "all" && a.class_id !== filterClass) return false;
    if (filterStatus === "upcoming" && (!a.due_date || new Date(a.due_date) < new Date())) return false;
    if (filterStatus === "past" && a.due_date && new Date(a.due_date) >= new Date()) return false;
    if (filterStatus === "draft" && a.is_published) return false;
    return true;
  });

  const getClassName = (id: string) => classes.find(c => c.id === id)?.name || "";
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || "";

  // Online test builder view
  if (onlineTestAssessment) {
    return (
      <OnlineTestBuilder
        assessment={onlineTestAssessment}
        onBack={() => { setOnlineTestAssessment(null); fetchAssessments(); }}
      />
    );
  }

  if (selectedAssessment) {
    const gradedCount = results.length;
    const totalStudents = classStudents.length;
    const allPublished = results.length > 0 && results.every(r => r.is_published);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setSelectedAssessment(null)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to Assessments
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOnlineTestAssessment(selectedAssessment)}>
            <PenTool className="mr-1 h-4 w-4" /> Online Questions
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="font-heading">{selectedAssessment.title}</CardTitle>
                <CardDescription>
                  {getClassName(selectedAssessment.class_id)} • {getSubjectName(selectedAssessment.subject_id)} • Max: {selectedAssessment.max_marks} marks
                  {selectedAssessment.due_date && ` • Due: ${format(new Date(selectedAssessment.due_date), "MMM d, yyyy")}`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={selectedAssessment.is_published ? "default" : "secondary"}>
                  {selectedAssessment.is_published ? "Published" : "Draft"}
                </Badge>
                <Badge variant="outline">{selectedAssessment.assessment_type}</Badge>
              </div>
            </div>
          </CardHeader>
          {(selectedAssessment.instructions || selectedAssessment.file_url || selectedAssessment.link_url) && (
            <CardContent className="space-y-3">
              {selectedAssessment.instructions && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedAssessment.instructions}</p>}
              {(selectedAssessment.file_url || selectedAssessment.link_url) && (
                <div className="flex flex-wrap gap-2">
                  {selectedAssessment.file_url && (
                    <a href={selectedAssessment.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                      <FileText className="h-3.5 w-3.5" /> View Attachment
                    </a>
                  )}
                  {selectedAssessment.link_url && (
                    <a href={selectedAssessment.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                      <ExternalLink className="h-3.5 w-3.5" /> Open Link
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Memo / Marking Guide Section */}
        <Card className="border-accent/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent-foreground" />
                <span className="text-sm font-medium">Marking Guide / Memo</span>
                {selectedAssessment.memo_url ? (
                  <Badge variant="default" className="text-xs">Uploaded ✓</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Not uploaded</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedAssessment.memo_url && (
                  <a href={selectedAssessment.memo_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      <Eye className="h-3 w-3 mr-1" /> View Memo
                    </Button>
                  </a>
                )}
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={uploadingMemo} onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt";
                  input.onchange = (e: any) => { if (e.target.files?.[0]) uploadMemoForAssessment(e.target.files[0]); };
                  input.click();
                }}>
                  {uploadingMemo ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                  {selectedAssessment.memo_url ? "Replace Memo" : "Upload Memo"}
                </Button>
              </div>
            </div>
            {!selectedAssessment.memo_url && (
              <p className="text-xs text-muted-foreground mt-2">Upload the answer key / memorandum to enable AI-powered marking of student submissions.</p>
            )}
          </CardContent>
        </Card>

        {/* Grading Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{gradedCount}/{totalStudents}</p>
            <p className="text-xs text-muted-foreground">Graded</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{submissions.length}</p>
            <p className="text-xs text-muted-foreground">Submissions</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{results.length > 0 ? (results.reduce((s, r) => s + (r.percentage || 0), 0) / results.length).toFixed(0) + "%" : "—"}</p>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="submissions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="submissions">Submissions ({submissions.length})</TabsTrigger>
            <TabsTrigger value="grade">Grade Students</TabsTrigger>
            <TabsTrigger value="results">Results Table ({gradedCount})</TabsTrigger>
          </TabsList>

          {/* Submissions Tab */}
          <TabsContent value="submissions">
            {submissions.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No submissions yet for this assessment.</CardContent></Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Student Submissions</CardTitle>
                  <CardDescription>{submissions.length} student(s) have submitted work</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {submissions.map(sub => {
                    const hasResult = results.find(r => r.student_id === sub.student_id);
                    return (
                      <div key={sub.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{sub.students?.full_name || "Unknown Student"}</p>
                          <p className="text-xs text-muted-foreground">{sub.students?.admission_number}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Submitted: {format(new Date(sub.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                          {sub.comments && <p className="text-xs text-muted-foreground mt-1 italic">"{sub.comments}"</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {hasResult ? (
                            <Badge variant="default">{hasResult.grade} ({hasResult.marks_obtained}/{selectedAssessment.max_marks})</Badge>
                          ) : (
                            <Badge variant="secondary">Not Graded</Badge>
                          )}
                          {sub.file_url && (
                            <div className="flex items-center gap-1">
                              <a href={sub.file_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" className="h-7 text-xs">
                                  <Eye className="h-3 w-3 mr-1" /> View
                                </Button>
                              </a>
                              <a href={sub.file_url} download>
                                <Button variant="outline" size="sm" className="h-7 text-xs">
                                  <Download className="h-3 w-3 mr-1" /> Download
                                </Button>
                              </a>
                            </div>
                          )}
                          <Button variant="outline" size="sm" className="h-7 text-xs" disabled={aiMarking && aiMarkingSubId === sub.id} onClick={() => aiMarkSubmission(sub.id)}>
                            {aiMarking && aiMarkingSubId === sub.id ? (
                              <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> AI Marking...</>
                            ) : (
                              <><Bot className="h-3 w-3 mr-1" /> AI Mark</>
                            )}
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                            const idx = classStudents.findIndex(s => s.id === sub.student_id);
                            if (idx >= 0) { setGradingStudentIdx(idx); }
                            const tabsEl = document.querySelector('[data-state="active"][value="grade"], [value="grade"]');
                            if (tabsEl) (tabsEl as HTMLElement).click();
                          }}>
                            Grade
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Inline Grading */}
          <TabsContent value="grade">
            {classStudents.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No students found for this class.</CardContent></Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Student {gradingStudentIdx + 1} of {classStudents.length}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" disabled={gradingStudentIdx === 0} onClick={() => setGradingStudentIdx(prev => prev - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" disabled={gradingStudentIdx >= classStudents.length - 1} onClick={() => setGradingStudentIdx(prev => prev + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="font-medium">{currentStudent?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{currentStudent?.admission_number}</p>
                    {currentResult && <Badge className="mt-1" variant="secondary">Previously graded: {currentResult.grade}</Badge>}
                  </div>

                  {/* Check for submission */}
                  {submissions.find(s => s.student_id === currentStudent?.id) && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="text-sm font-medium text-primary">📎 Student submitted work</p>
                      {submissions.find(s => s.student_id === currentStudent?.id)?.file_url && (
                        <div className="flex items-center gap-3 mt-1">
                          <a href={submissions.find(s => s.student_id === currentStudent?.id)?.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline flex items-center gap-1">
                            <Eye className="h-3 w-3" /> View submission
                          </a>
                          <a href={submissions.find(s => s.student_id === currentStudent?.id)?.file_url} download className="text-xs text-primary underline flex items-center gap-1">
                            <Download className="h-3 w-3" /> Download
                          </a>
                        </div>
                      )}
                      {submissions.find(s => s.student_id === currentStudent?.id)?.comments && (
                        <p className="text-xs text-muted-foreground mt-1">{submissions.find(s => s.student_id === currentStudent?.id)?.comments}</p>
                      )}
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Marks (out of {selectedAssessment.max_marks})</Label>
                      <Input type="number" min="0" max={selectedAssessment.max_marks} value={gradeForm.marks} onChange={e => setGradeForm(p => ({ ...p, marks: e.target.value }))} />
                      {gradeForm.marks && (
                        <p className="text-xs text-muted-foreground">
                          {((parseFloat(gradeForm.marks) / (selectedAssessment.max_marks || 100)) * 100).toFixed(0)}% — Grade: <span className="font-bold text-primary">{zimGrade((parseFloat(gradeForm.marks) / (selectedAssessment.max_marks || 100)) * 100)}</span>
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Feedback</Label>
                      <Textarea rows={3} value={gradeForm.feedback} onChange={e => setGradeForm(p => ({ ...p, feedback: e.target.value }))} placeholder="Optional feedback..." />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={saveGrade} disabled={gradeLoading || !gradeForm.marks} className="flex-1">
                      {gradeLoading ? "Saving..." : "Save & Next"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Results Table */}
          <TabsContent value="results">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Assessment Results</CardTitle>
                  {results.length > 0 && !allPublished && (
                    <Button size="sm" onClick={publishResults}>
                      <Eye className="mr-1 h-4 w-4" /> Publish All Results
                    </Button>
                  )}
                  {allPublished && <Badge>All Published ✓</Badge>}
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {results.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No grades entered yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Student</th>
                        <th className="px-3 py-2">Marks</th>
                        <th className="px-3 py-2">%</th>
                        <th className="px-3 py-2">Grade</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(r => (
                        <tr key={r.id} className="border-b">
                          <td className="px-3 py-2">{r.students?.full_name}</td>
                          <td className="px-3 py-2 text-center font-medium">{r.marks_obtained}/{selectedAssessment.max_marks}</td>
                          <td className="px-3 py-2 text-center">{(r.percentage || 0).toFixed(0)}%</td>
                          <td className="px-3 py-2 text-center"><Badge>{r.grade}</Badge></td>
                          <td className="px-3 py-2 text-center">
                            <Badge variant={r.is_published ? "default" : "secondary"}>{r.is_published ? "Published" : "Draft"}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recent Submissions Alert */}
      {allSubmissions.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Recent Submissions ({allSubmissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-60 overflow-y-auto">
            {allSubmissions.slice(0, 10).map(sub => {
              const assess = assessments.find(a => a.id === sub.assessment_id);
              return (
                <div key={sub.id} className="flex items-center justify-between rounded-lg bg-background p-2 text-sm border">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs">{sub.students?.full_name || "Unknown"}</p>
                    <p className="text-[11px] text-muted-foreground">{assess?.title || sub.assessments?.title || "Assessment"}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(sub.created_at), "MMM d, h:mm a")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.file_url && (
                      <div className="flex items-center gap-1">
                        <a href={sub.file_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <Eye className="h-3 w-3 mr-1" /> View
                          </Button>
                        </a>
                        <a href={sub.file_url} download>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <Download className="h-3 w-3 mr-1" /> Download
                          </Button>
                        </a>
                      </div>
                    )}
                    {assess && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openAssessmentDetail(assess)}>
                        Grade
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All Classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past</SelectItem>
              <SelectItem value="draft">Drafts</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="mr-1 h-4 w-4" /> Create Assessment</Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">Create Assessment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Mid-term Biology Test" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Type</Label>
                <Select value={form.assessment_type} onValueChange={v => setForm(p => ({ ...p, assessment_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{assessmentTypes.map(t => <SelectItem key={t} value={t}>{typeLabels[t] || t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Max Marks</Label><Input type="number" value={form.max_marks} onChange={e => setForm(p => ({ ...p, max_marks: e.target.value }))} /></div>
            </div>
            {form.assessment_type === "online_test" && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm space-y-1">
                <p className="font-medium text-primary">📝 Online MCQ Test</p>
                <p className="text-xs text-muted-foreground">After creating this assessment, you'll be taken to the <strong>Question Builder</strong> where you can:</p>
                <ul className="text-xs text-muted-foreground list-disc ml-4 space-y-0.5">
                  <li>Add multiple-choice questions (A, B, C, D options)</li>
                  <li>Set the correct answer for each question</li>
                  <li>Assign marks per question</li>
                  <li>Add explanations (shown after grading)</li>
                </ul>
                <p className="text-xs text-muted-foreground">Students will take the test online and it will be <strong>auto-graded</strong> instantly.</p>
              </div>
            )}
            {form.assessment_type === "online_test" && (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium flex items-center gap-1"><Clock className="h-4 w-4" /> Test Schedule & Timer</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Available From</Label>
                    <Input type="datetime-local" value={form.scheduled_start} onChange={e => setForm(p => ({ ...p, scheduled_start: e.target.value }))} />
                    <p className="text-[10px] text-muted-foreground">Students can only start after this time</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Available Until</Label>
                    <Input type="datetime-local" value={form.scheduled_end} onChange={e => setForm(p => ({ ...p, scheduled_end: e.target.value }))} />
                    <p className="text-[10px] text-muted-foreground">Test closes after this time</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Time Limit (minutes)</Label>
                  <Input type="number" min="1" placeholder="e.g. 30" value={form.time_limit_minutes} onChange={e => setForm(p => ({ ...p, time_limit_minutes: e.target.value }))} />
                  <p className="text-[10px] text-muted-foreground">Timer starts when student clicks "Start Test". Leave empty for no time limit.</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Class *</Label>
                <Select value={form.class_id} onValueChange={v => setForm(p => ({ ...p, class_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto" position="popper" sideOffset={4}>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Subject *</Label>
                <Select value={form.subject_id} onValueChange={v => setForm(p => ({ ...p, subject_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto" position="popper" sideOffset={4}>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Instructions</Label><Textarea rows={4} value={form.instructions} onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))} placeholder="Instructions for students..." /></div>
            <div className="space-y-2">
              <Label>Link URL (optional)</Label>
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} placeholder="https://docs.google.com/... or any URL" />
              </div>
              <p className="text-xs text-muted-foreground">Paste a link to an online document, video, or resource</p>
            </div>
            <div className="space-y-2">
              <Label>File Attachment (question paper, rubric, scan)</Label>
              <div className="rounded-lg border-2 border-dashed p-3 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileRef.current?.click()}>
                <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground mt-1">{formFile ? formFile.name : "Click to attach a document, image, or scan"}</p>
                <p className="text-[10px] text-muted-foreground">PDF, DOCX, images, etc.</p>
              </div>
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp" onChange={e => { if (e.target.files?.[0]) setFormFile(e.target.files[0]); }} />
              {formFile && (
                <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => { setFormFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
                  Remove file
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label>Marking Guide / Memo (for AI marking)</Label>
              <div className="rounded-lg border-2 border-dashed border-accent/50 p-3 text-center cursor-pointer hover:border-accent transition-colors" onClick={() => memoFileRef.current?.click()}>
                <BookOpen className="mx-auto h-6 w-6 text-accent-foreground/60" />
                <p className="text-xs text-muted-foreground mt-1">{formMemoFile ? formMemoFile.name : "Upload answer key / memorandum"}</p>
                <p className="text-[10px] text-muted-foreground">Used by AI to mark student submissions</p>
              </div>
              <input ref={memoFileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt" onChange={e => { if (e.target.files?.[0]) setFormMemoFile(e.target.files[0]); }} />
              {formMemoFile && (
                <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => { setFormMemoFile(null); if (memoFileRef.current) memoFileRef.current.value = ""; }}>
                  Remove memo
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_published} onCheckedChange={v => setForm(p => ({ ...p, is_published: v }))} />
              <Label>Publish immediately</Label>
            </div>
            <Button onClick={createAssessment} disabled={submitting} className="w-full">{submitting ? "Creating..." : "Create Assessment"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Marking Result Dialog */}
      <Dialog open={aiResultDialog} onOpenChange={setAiResultDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" /> AI Marking Result
            </DialogTitle>
          </DialogHeader>
          {aiResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Card><CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{aiResult.marks_obtained}/{selectedAssessment?.max_marks}</p>
                  <p className="text-xs text-muted-foreground">Marks</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">{aiResult.percentage?.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Percentage</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{aiResult.grade}</p>
                  <p className="text-xs text-muted-foreground">Grade</p>
                </CardContent></Card>
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-medium">AI Feedback</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiResult.feedback}</p>
              </div>
              <p className="text-xs text-muted-foreground italic">⚠️ Review the AI marking before applying. You can adjust marks manually after applying.</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setAiResultDialog(false); setAiResult(null); }}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={() => {
                  if (aiMarkingSubId) applyAiMarks(aiMarkingSubId);
                }}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Apply Grade
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assessments List */}
      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : filteredAssessments.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          No assessments found. Create one to get started!
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filteredAssessments.map(a => {
            const isPast = a.due_date && new Date(a.due_date) < new Date();
            return (
              <Card key={a.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => openAssessmentDetail(a)}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{a.title}</p>
                      <Badge variant={!a.is_published ? "secondary" : isPast ? "destructive" : "default"} className="text-xs">
                        {!a.is_published ? "Draft" : isPast ? "Past" : "Active"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{a.assessment_type === "online_test" ? "Online Test" : a.assessment_type}</Badge>
                      {a.is_online && <Badge variant="outline" className="text-xs border-primary/40 text-primary">🖥 Online</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getClassName(a.class_id)} • {getSubjectName(a.subject_id)}
                      {a.due_date && ` • Due: ${format(new Date(a.due_date), "MMM d, yyyy")}`}
                      {a.max_marks && ` • ${a.max_marks} marks`}
                      {a.time_limit_minutes && ` • ⏱ ${a.time_limit_minutes} min`}
                      {a.scheduled_start && ` • Opens: ${format(new Date(a.scheduled_start), "MMM d, h:mm a")}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {a.file_url ? (
                        <a href={a.file_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <FileText className="h-3 w-3" /> Question Paper ✓
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No question paper</span>
                      )}
                      <span className="text-muted-foreground">•</span>
                      {(a as any).memo_url ? (
                        <a href={(a as any).memo_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <BookOpen className="h-3 w-3" /> Memo ✓
                        </a>
                      ) : (
                        <span className="text-xs text-orange-500 italic">No memo uploaded</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={e => { e.stopPropagation(); openAssessmentDetail(a); }}>
                      <Upload className="mr-1 h-3 w-3" /> Upload Files & Mark
                    </Button>
                    {a.is_online && (
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={e => { e.stopPropagation(); setOnlineTestAssessment(a); }}>
                        <PenTool className="mr-1 h-3 w-3" /> Design Questions
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={e => { e.stopPropagation(); deleteAssessment(a.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
