// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Plus, Upload, Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const formOptions = ["Form 1", "Form 2", "Form 3", "Form 4", "Lower 6", "Upper 6"];
const termOptions = ["Term 1", "Term 2", "Term 3"];
const examTypes = ["end_of_term", "mid_term", "mock", "monthly", "continuous"];

function zimGrade(m: number) {
  if (m >= 90) return "A*"; if (m >= 80) return "A"; if (m >= 70) return "B";
  if (m >= 60) return "C"; if (m >= 50) return "D"; if (m >= 40) return "E"; return "U";
}

export default function ExamResultsEntry() {
  const { toast } = useToast();
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [examId, setExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [form, setForm] = useState("Form 1");
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string, { mark: string; comment: string; existingId?: string }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create-exam form state
  const [newExam, setNewExam] = useState({
    name: "", exam_type: "end_of_term", form_level: "Form 1",
    term: "Term 1", academic_year: new Date().getFullYear().toString(),
    start_date: "", end_date: "",
  });

  useEffect(() => { fetchExams(); fetchSubjects(); }, []);
  useEffect(() => { if (form) fetchStudents(); }, [form]);
  useEffect(() => { if (examId && subjectId && students.length) fetchExisting(); }, [examId, subjectId, students]);

  async function fetchExams() {
    const { data } = await supabase.from("exams").select("*").order("created_at", { ascending: false });
    setExams(data || []);
  }
  async function fetchSubjects() {
    const { data } = await supabase.from("subjects").select("id, name, code").order("name");
    setSubjects(data || []);
  }
  async function fetchStudents() {
    setLoading(true);
    const { data } = await supabase.from("students")
      .select("id, full_name, admission_number, form")
      .eq("form", form).eq("status", "active").order("full_name");
    setStudents(data || []);
    setLoading(false);
  }
  async function fetchExisting() {
    const ids = students.map(s => s.id);
    const { data } = await supabase.from("exam_results")
      .select("id, student_id, mark, teacher_comment")
      .eq("exam_id", examId).eq("subject_id", subjectId).in("student_id", ids);
    const m: any = {};
    students.forEach(s => { m[s.id] = { mark: "", comment: "" }; });
    (data || []).forEach((r: any) => {
      m[r.student_id] = { mark: String(r.mark ?? ""), comment: r.teacher_comment || "", existingId: r.id };
    });
    setMarks(m);
  }

  async function createExam() {
    if (!newExam.name) { toast({ title: "Exam name required", variant: "destructive" }); return; }
    const { data, error } = await supabase.from("exams").insert(newExam).select().single();
    if (error) { toast({ title: "Failed to create exam", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Exam created" });
    setNewExam({ ...newExam, name: "" });
    await fetchExams();
    setExamId(data.id);
  }

  async function saveMarks() {
    if (!examId || !subjectId) { toast({ title: "Select exam & subject", variant: "destructive" }); return; }
    setSaving(true);
    const inserts: any[] = []; const updates: any[] = [];
    for (const s of students) {
      const e = marks[s.id]; if (!e?.mark) continue;
      const v = parseFloat(e.mark);
      if (isNaN(v) || v < 0 || v > 100) continue;
      const row: any = { exam_id: examId, subject_id: subjectId, student_id: s.id,
        mark: v, grade: zimGrade(v), teacher_comment: e.comment || null };
      if (e.existingId) { row.id = e.existingId; updates.push(row); } else inserts.push(row);
    }
    let err: any = null;
    if (inserts.length) { const r = await supabase.from("exam_results").insert(inserts); err = r.error; }
    if (!err && updates.length) { const r = await supabase.from("exam_results").upsert(updates, { onConflict: "id" }); err = r.error; }
    if (err) toast({ title: "Save failed", description: err.message, variant: "destructive" });
    else { toast({ title: `Saved ${inserts.length + updates.length} marks` }); await fetchExisting(); }
    setSaving(false);
  }

  async function handleCSV(file: File) {
    if (!examId) { toast({ title: "Select exam first", variant: "destructive" }); return; }
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { toast({ title: "Empty CSV", variant: "destructive" }); return; }
    const header = lines[0].split(",").map(h => h.trim().toLowerCase());
    const idxAdm = header.indexOf("admission_number");
    const idxSubj = header.indexOf("subject_code");
    const idxMark = header.indexOf("mark");
    const idxComm = header.indexOf("comment");
    if (idxAdm < 0 || idxSubj < 0 || idxMark < 0) {
      toast({ title: "CSV headers required: admission_number, subject_code, mark, comment(optional)", variant: "destructive" });
      return;
    }
    setSaving(true);
    const studentMap: Record<string, string> = {};
    const subjMap: Record<string, string> = {};
    const { data: stu } = await supabase.from("students").select("id, admission_number");
    stu?.forEach((s: any) => { studentMap[s.admission_number?.toUpperCase()] = s.id; });
    subjects.forEach(s => { if (s.code) subjMap[s.code.toUpperCase()] = s.id; });

    const rows: any[] = []; const errors: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      const adm = cols[idxAdm]?.toUpperCase(); const sc = cols[idxSubj]?.toUpperCase();
      const mk = parseFloat(cols[idxMark]);
      const sid = studentMap[adm]; const subjId = subjMap[sc];
      if (!sid) { errors.push(`Row ${i + 1}: unknown adm# ${adm}`); continue; }
      if (!subjId) { errors.push(`Row ${i + 1}: unknown subject ${sc}`); continue; }
      if (isNaN(mk) || mk < 0 || mk > 100) { errors.push(`Row ${i + 1}: invalid mark`); continue; }
      rows.push({ exam_id: examId, subject_id: subjId, student_id: sid,
        mark: mk, grade: zimGrade(mk), teacher_comment: idxComm >= 0 ? (cols[idxComm] || null) : null });
    }
    if (rows.length) {
      const { error } = await supabase.from("exam_results")
        .upsert(rows, { onConflict: "exam_id,student_id,subject_id" });
      if (error) toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      else toast({ title: `Imported ${rows.length} results${errors.length ? `, ${errors.length} skipped` : ""}` });
    } else {
      toast({ title: "No valid rows", description: errors.slice(0, 3).join("; "), variant: "destructive" });
    }
    setSaving(false);
  }

  function downloadTemplate() {
    const csv = "admission_number,subject_code,mark,comment\nGHS00001,MATH,75,Good work\n";
    const b = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b);
    a.download = "exam-results-template.csv"; a.click();
  }

  const filled = Object.values(marks).filter((e: any) => e?.mark).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Enter Exam Results</CardTitle>
        <CardDescription>Create exams, enter marks per subject, or bulk upload via CSV</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="enter">
          <TabsList>
            <TabsTrigger value="enter">Enter Marks</TabsTrigger>
            <TabsTrigger value="bulk">Bulk CSV Upload</TabsTrigger>
            <TabsTrigger value="create">Create Exam</TabsTrigger>
          </TabsList>

          {/* Manual entry */}
          <TabsContent value="enter" className="space-y-4 pt-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Exam *</Label>
                <Select value={examId} onValueChange={setExamId}>
                  <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
                  <SelectContent>
                    {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name} — {e.term} {e.academic_year} ({e.form_level})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Form *</Label>
                <Select value={form} onValueChange={setForm}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{formOptions.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : examId && subjectId && students.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{filled}/{students.length} entered</Badge>
                  <Button onClick={saveMarks} disabled={saving || filled === 0}>
                    <Save className="mr-1 h-4 w-4" />{saving ? "Saving..." : `Save ${filled}`}
                  </Button>
                </div>
                <div className="overflow-x-auto rounded border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-2 py-2 text-left">#</th>
                        <th className="px-2 py-2 text-left">Student</th>
                        <th className="px-2 py-2 text-left">Adm #</th>
                        <th className="px-2 py-2 text-center w-24">Mark %</th>
                        <th className="px-2 py-2 text-center w-16">Grade</th>
                        <th className="px-2 py-2 text-left">Comment</th>
                        <th className="px-2 py-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, i) => {
                        const e = marks[s.id] || { mark: "", comment: "" };
                        const v = parseFloat(e.mark);
                        const g = !isNaN(v) ? zimGrade(v) : "";
                        return (
                          <tr key={s.id} className="border-t">
                            <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                            <td className="px-2 py-1 font-medium">{s.full_name}</td>
                            <td className="px-2 py-1 text-xs text-muted-foreground">{s.admission_number}</td>
                            <td className="px-2 py-1">
                              <Input type="number" min="0" max="100" value={e.mark}
                                onChange={ev => setMarks(p => ({ ...p, [s.id]: { ...p[s.id], mark: ev.target.value } }))}
                                className="h-8 text-center w-20 mx-auto" />
                            </td>
                            <td className="px-2 py-1 text-center">{g && <Badge variant="outline">{g}</Badge>}</td>
                            <td className="px-2 py-1">
                              <Input value={e.comment}
                                onChange={ev => setMarks(p => ({ ...p, [s.id]: { ...p[s.id], comment: ev.target.value } }))}
                                className="h-8 text-xs" placeholder="Optional" />
                            </td>
                            <td className="px-2 py-1 text-center">
                              {e.existingId ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                                : e.mark ? <AlertCircle className="h-4 w-4 text-amber-500 mx-auto" /> : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : examId && subjectId ? (
              <p className="text-center text-muted-foreground py-8">No active students in {form}.</p>
            ) : (
              <p className="text-center text-muted-foreground py-8">Select exam, form and subject to enter marks.</p>
            )}
          </TabsContent>

          {/* Bulk CSV */}
          <TabsContent value="bulk" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Target Exam *</Label>
              <Select value={examId} onValueChange={setExamId}>
                <SelectTrigger className="max-w-md"><SelectValue placeholder="Select exam" /></SelectTrigger>
                <SelectContent>
                  {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name} — {e.term} {e.academic_year} ({e.form_level})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded border p-4 space-y-3">
              <p className="text-sm">CSV format: <code>admission_number,subject_code,mark,comment</code></p>
              <div className="flex gap-3 flex-wrap">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="mr-1 h-4 w-4" /> Download Template
                </Button>
                <label className="inline-flex">
                  <input type="file" accept=".csv" className="hidden"
                    onChange={e => e.target.files?.[0] && handleCSV(e.target.files[0])} />
                  <Button asChild disabled={!examId || saving}>
                    <span><Upload className="mr-1 h-4 w-4" /> {saving ? "Uploading..." : "Upload CSV"}</span>
                  </Button>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Existing rows for the same student/subject will be overwritten. Subject codes must match the Subjects table.
              </p>
            </div>
          </TabsContent>

          {/* Create exam */}
          <TabsContent value="create" className="space-y-3 pt-4 max-w-2xl">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Exam Name *</Label>
                <Input value={newExam.name} onChange={e => setNewExam({ ...newExam, name: e.target.value })}
                  placeholder="e.g. Form 4 End of Term 2 2026" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newExam.exam_type} onValueChange={v => setNewExam({ ...newExam, exam_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{examTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Form</Label>
                <Select value={newExam.form_level} onValueChange={v => setNewExam({ ...newExam, form_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{formOptions.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Term</Label>
                <Select value={newExam.term} onValueChange={v => setNewExam({ ...newExam, term: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{termOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input value={newExam.academic_year} onChange={e => setNewExam({ ...newExam, academic_year: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={newExam.start_date} onChange={e => setNewExam({ ...newExam, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={newExam.end_date} onChange={e => setNewExam({ ...newExam, end_date: e.target.value })} />
              </div>
            </div>
            <Button onClick={createExam}><Plus className="mr-1 h-4 w-4" /> Create Exam</Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
