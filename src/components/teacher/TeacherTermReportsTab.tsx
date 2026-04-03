// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Loader2, Plus, Search, Save, Eye } from "lucide-react";
import { format } from "date-fns";

const formOptions = ["Form 1", "Form 2", "Form 3", "Form 4", "Lower 6", "Upper 6"];
const termOptions = ["Term 1", "Term 2", "Term 3"];

function zimGrade(mark: number): string {
  if (mark >= 90) return "A*";
  if (mark >= 80) return "A";
  if (mark >= 70) return "B";
  if (mark >= 60) return "C";
  if (mark >= 50) return "D";
  if (mark >= 40) return "E";
  if (mark >= 30) return "F";
  return "U";
}

interface TeacherTermReportsTabProps {
  userId: string;
  classes: { id: string; name: string; form_level: string }[];
  subjects: { id: string; name: string }[];
}

export default function TeacherTermReportsTab({ userId, classes, subjects }: TeacherTermReportsTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [filterTerm, setFilterTerm] = useState("Term 1");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  // Manual report creation
  const [showCreate, setShowCreate] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [subjectMarks, setSubjectMarks] = useState<{ subject_id: string; mark: string; comment: string }[]>([]);
  const [classTeacherComment, setClassTeacherComment] = useState("");
  const [headComment, setHeadComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedClassId) fetchReports();
  }, [selectedClassId, filterTerm, filterYear]);

  async function fetchStudents() {
    if (!selectedClassId) {
      setStudents([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("student_classes")
      .select("student_id, students(id, full_name, admission_number, form)")
      .eq("class_id", selectedClassId);
    
    const studentList = data?.map(d => d.students).filter(Boolean) || [];
    setStudents(studentList);
    setLoading(false);
  }

  async function fetchReports() {
    const studentIds = students.map(s => s.id);
    if (studentIds.length === 0) {
      setReports([]);
      return;
    }
    const { data } = await supabase
      .from("term_reports")
      .select("*, students(full_name, admission_number)")
      .in("student_id", studentIds)
      .eq("term", filterTerm)
      .eq("academic_year", filterYear)
      .order("class_rank", { nullsFirst: false });
    if (data) setReports(data);
  }

  // Re-fetch reports when students change
  useEffect(() => {
    if (students.length > 0) fetchReports();
  }, [students, filterTerm, filterYear]);

  function openCreateDialog(studentId: string) {
    setSelectedStudentId(studentId);
    // Pre-fill subject marks from class subjects
    const classSubjects = subjects.slice(0, 10); // Use available subjects
    setSubjectMarks(classSubjects.map(s => ({ subject_id: s.id, mark: "", comment: "" })));
    setClassTeacherComment("");
    setHeadComment("");
    setShowCreate(true);
  }

  async function saveManualReport() {
    if (!selectedStudentId) return;
    setSaving(true);
    try {
      const student = students.find(s => s.id === selectedStudentId);
      const validMarks = subjectMarks.filter(sm => sm.mark !== "");
      
      if (validMarks.length === 0) {
        toast({ title: "No marks entered", variant: "destructive" });
        setSaving(false);
        return;
      }

      const totalMark = validMarks.reduce((sum, m) => sum + parseFloat(m.mark), 0);
      const avgMark = totalMark / validMarks.length;

      const examData = validMarks.map(sm => {
        const subj = subjects.find(s => s.id === sm.subject_id);
        return {
          subject_id: sm.subject_id,
          subjects: { name: subj?.name || "Unknown" },
          mark: parseFloat(sm.mark),
          grade: zimGrade(parseFloat(sm.mark)),
          teacher_comment: sm.comment || null
        };
      });

      // Delete existing report for same student/term/year
      await supabase
        .from("term_reports")
        .delete()
        .eq("student_id", selectedStudentId)
        .eq("term", filterTerm)
        .eq("academic_year", filterYear);

      const { error } = await supabase.from("term_reports").insert({
        student_id: selectedStudentId,
        academic_year: filterYear,
        term: filterTerm,
        form_level: student?.form || "",
        total_marks: totalMark,
        average_mark: Math.round(avgMark * 100) / 100,
        overall_grade: zimGrade(avgMark),
        exam_data: examData,
        assessment_data: [],
        class_teacher_comment: classTeacherComment || null,
        head_comment: headComment || null,
        generated_by: userId,
        is_published: false
      });

      if (error) throw error;

      toast({ title: "Report created", description: `Manual report saved for ${student?.full_name}` });
      setShowCreate(false);
      fetchReports();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  }

  async function publishReport(reportId: string, current: boolean) {
    await supabase.from("term_reports").update({ is_published: !current }).eq("id", reportId);
    
    if (!current) {
      // Notify student and parent when publishing
      const report = reports.find(r => r.id === reportId);
      if (report) {
        const { data: student } = await supabase
          .from("students")
          .select("user_id")
          .eq("id", report.student_id)
          .single();
        
        if (student?.user_id) {
          await supabase.from("notifications").insert({
            user_id: student.user_id,
            title: "Term Report Published",
            message: `Your ${filterTerm} ${filterYear} report is now available.`,
            type: "term_report"
          });
        }

        // Notify linked parents
        const { data: parentLinks } = await supabase
          .from("parent_students")
          .select("parent_id")
          .eq("student_id", report.student_id);
        
        if (parentLinks?.length) {
          await supabase.from("notifications").insert(
            parentLinks.map(pl => ({
              user_id: pl.parent_id,
              title: "Term Report Available",
              message: `The ${filterTerm} ${filterYear} report for your child is now available.`,
              type: "term_report"
            }))
          );
        }
      }
    }

    toast({ title: current ? "Report unpublished" : "Report published & notifications sent" });
    fetchReports();
  }

  const filteredStudents = students.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.full_name.toLowerCase().includes(q) || s.admission_number.toLowerCase().includes(q);
  });

  if (loading && selectedClassId) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <FileText className="h-5 w-5" /> Term Reports
        </CardTitle>
        <CardDescription>Create manual term reports for students in your classes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Term</Label>
            <Select value={filterTerm} onValueChange={setFilterTerm}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {termOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <Input value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-[100px]" />
          </div>
          <div className="space-y-2 flex-1 min-w-[200px]">
            <Label>Search Student</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                placeholder="Search by name or admission number..." 
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {!selectedClassId ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Select a class to view and create term reports</p>
          </div>
        ) : (
          <>
            {/* Student list with create option */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Students ({filteredStudents.length})</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Adm #</TableHead>
                      <TableHead>Report Status</TableHead>
                      <TableHead>Average</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map(student => {
                      const existingReport = reports.find(r => r.student_id === student.id);
                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.full_name}</TableCell>
                          <TableCell className="text-xs">{student.admission_number}</TableCell>
                          <TableCell>
                            {existingReport ? (
                              <Badge variant={existingReport.is_published ? "default" : "outline"}>
                                {existingReport.is_published ? "Published" : "Draft"}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">No report</span>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {existingReport ? `${existingReport.average_mark}%` : "—"}
                          </TableCell>
                          <TableCell>
                            {existingReport && (
                              <Badge variant="outline" className={
                                ["A*", "A"].includes(existingReport.overall_grade) ? "bg-green-100 text-green-800" :
                                existingReport.overall_grade === "B" ? "bg-blue-100 text-blue-800" :
                                "bg-amber-100 text-amber-800"
                              }>
                                {existingReport.overall_grade}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => openCreateDialog(student.id)}>
                                <Plus className="mr-1 h-3 w-3" /> {existingReport ? "Edit" : "Create"}
                              </Button>
                              {existingReport && (
                                <Button 
                                  size="sm" 
                                  variant={existingReport.is_published ? "secondary" : "default"}
                                  onClick={() => publishReport(existingReport.id, existingReport.is_published)}
                                >
                                  {existingReport.is_published ? "Unpublish" : "Publish"}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}

        {/* Create/Edit Report Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {reports.find(r => r.student_id === selectedStudentId) ? "Edit" : "Create"} Term Report
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Student: <strong>{students.find(s => s.id === selectedStudentId)?.full_name}</strong> · {filterTerm} {filterYear}
              </p>

              {/* Subject marks */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Subject Marks & Comments</Label>
                {subjectMarks.map((sm, idx) => {
                  const subj = subjects.find(s => s.id === sm.subject_id);
                  return (
                    <div key={sm.subject_id} className="grid grid-cols-[1fr_80px_1fr] gap-2 items-start border rounded-lg p-2">
                      <div className="text-sm font-medium pt-2">{subj?.name}</div>
                      <div>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="%"
                          value={sm.mark}
                          onChange={e => {
                            const updated = [...subjectMarks];
                            updated[idx].mark = e.target.value;
                            setSubjectMarks(updated);
                          }}
                        />
                      </div>
                      <div>
                        <Input
                          placeholder="Teacher comment..."
                          value={sm.comment}
                          onChange={e => {
                            const updated = [...subjectMarks];
                            updated[idx].comment = e.target.value;
                            setSubjectMarks(updated);
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <Label>Class Teacher's Comment</Label>
                <Textarea 
                  rows={2} 
                  value={classTeacherComment} 
                  onChange={e => setClassTeacherComment(e.target.value)} 
                  placeholder="Overall class teacher comment..."
                />
              </div>
              <div className="space-y-2">
                <Label>Head's Comment</Label>
                <Textarea 
                  rows={2} 
                  value={headComment} 
                  onChange={e => setHeadComment(e.target.value)} 
                  placeholder="Headmaster/Headmistress comment..."
                />
              </div>

              <Button onClick={saveManualReport} disabled={saving} className="w-full">
                <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save Report"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
