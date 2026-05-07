// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, FileText, Printer, Download } from "lucide-react";
import ReportCardDownloadButton from "@/components/student/ReportCardPDF";

const formOptions = ["Form 1", "Form 2", "Form 3", "Form 4", "Lower 6", "Upper 6"];
const termOptions = ["Term 1", "Term 2", "Term 3"];

function gradeColor(g: string) {
  if (["A*", "A"].includes(g)) return "bg-green-100 text-green-800";
  if (g === "B") return "bg-blue-100 text-blue-800";
  if (g === "C") return "bg-cyan-100 text-cyan-800";
  if (["D", "E"].includes(g)) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

export default function ExamResultsManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [filterForm, setFilterForm] = useState("Form 1");
  const [filterTerm, setFilterTerm] = useState("Term 1");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [results, setResults] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchExams();
  }, [filterForm, filterTerm, filterYear]);

  useEffect(() => {
    if (selectedExamId) fetchResults();
    else setResults([]);
  }, [selectedExamId]);

  async function fetchExams() {
    const { data, error } = await supabase
      .from("exams")
      .select("id, name, form_level, term, academic_year, is_published, exam_type")
      .eq("form_level", filterForm)
      .eq("term", filterTerm)
      .eq("academic_year", filterYear)
      .order("created_at", { ascending: false });
    if (error) { toast({ title: "Failed to load exams", description: error.message, variant: "destructive" }); return; }
    setExams(data || []);
    if (data && data.length > 0) setSelectedExamId(data[0].id);
    else setSelectedExamId("");
  }

  async function fetchResults() {
    setLoading(true);
    const { data, error } = await supabase
      .from("exam_results")
      .select("id, mark, grade, teacher_comment, student_id, subject_id, students(id, full_name, admission_number, form, stream), subjects(name, code)")
      .eq("exam_id", selectedExamId);
    if (error) { toast({ title: "Failed to load results", description: error.message, variant: "destructive" }); }
    setResults(data || []);
    setLoading(false);
  }

  // Aggregate per-student
  const aggregated = useMemo(() => {
    const byStudent: Record<string, any> = {};
    for (const r of results) {
      const sid = r.student_id;
      if (!byStudent[sid]) {
        byStudent[sid] = {
          student: r.students,
          rows: [],
          total: 0,
          count: 0,
        };
      }
      byStudent[sid].rows.push(r);
      byStudent[sid].total += Number(r.mark || 0);
      byStudent[sid].count += 1;
    }
    const arr = Object.values(byStudent).map((s: any) => ({
      ...s,
      average: s.count > 0 ? s.total / s.count : 0,
    }));
    arr.sort((a: any, b: any) => b.average - a.average);
    arr.forEach((s: any, i: number) => { s.rank = i + 1; });
    return arr;
  }, [results]);

  const filtered = aggregated.filter((s: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.student?.full_name?.toLowerCase().includes(q) || s.student?.admission_number?.toLowerCase().includes(q);
  });

  const currentExam = exams.find(e => e.id === selectedExamId);

  function zimGrade(mark: number): string {
    if (mark >= 90) return "A*"; if (mark >= 80) return "A"; if (mark >= 70) return "B";
    if (mark >= 60) return "C"; if (mark >= 50) return "D"; if (mark >= 40) return "E"; return "U";
  }

  function printAll() {
    if (!currentExam || filtered.length === 0) { toast({ title: "Nothing to print" }); return; }
    const totalStudents = filtered.length;
    const html = `
<!DOCTYPE html><html><head><title>${currentExam.name} Results</title>
<style>
@media print { @page { size: A4; margin: 12mm; } }
body { font-family: 'Times New Roman', serif; color: #1a1a1a; font-size: 11pt; }
h1 { color: #1a5276; text-align:center; margin-bottom: 4px; }
h2 { text-align:center; font-size: 12pt; margin-bottom: 16px; color:#555; }
table { width: 100%; border-collapse: collapse; }
th { background: #1a5276; color: #fff; padding: 6px; text-align: left; }
td { padding: 5px 6px; border-bottom: 1px solid #dee2e6; }
tr:nth-child(even) td { background: #f8f9fa; }
.print-btn { position: fixed; top: 12px; right: 12px; padding: 8px 16px; background:#1a5276; color:#fff; border:0; border-radius:6px; cursor:pointer; }
@media print { .print-btn { display:none; } }
</style></head><body>
<button class="print-btn" onclick="window.print()">🖨️ Print</button>
<h1>Gifford High School</h1>
<h2>${currentExam.name} — ${currentExam.form_level} — ${currentExam.term} ${currentExam.academic_year}</h2>
<table>
<thead><tr><th>Rank</th><th>Adm No.</th><th>Student</th><th>Subjects</th><th>Average %</th><th>Grade</th></tr></thead>
<tbody>
${filtered.map((s: any) => `<tr>
<td><strong>${s.rank}</strong>/${totalStudents}</td>
<td>${s.student?.admission_number || '—'}</td>
<td>${s.student?.full_name || '—'}</td>
<td>${s.count}</td>
<td><strong>${s.average.toFixed(1)}%</strong></td>
<td>${zimGrade(s.average)}</td>
</tr>`).join("")}
</tbody></table>
<p style="margin-top:20px;font-size:9pt;color:#888;text-align:center;">Generated ${new Date().toLocaleString("en-GB")}</p>
</body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  }

  function exportCSV() {
    if (filtered.length === 0) return;
    const rows = [["Rank", "Admission No", "Student", "Form", "Subjects", "Total", "Average %", "Grade"]];
    filtered.forEach((s: any) => {
      rows.push([
        s.rank, s.student?.admission_number || "", s.student?.full_name || "",
        s.student?.form || "", s.count, s.total.toFixed(1), s.average.toFixed(2), zimGrade(s.average),
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${currentExam?.name || "exam"}-results.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Exam Results Management</CardTitle>
        <CardDescription>View, search, print and download results for any exam</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-2">
            <Label>Form</Label>
            <Select value={filterForm} onValueChange={setFilterForm}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>{formOptions.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Term</Label>
            <Select value={filterTerm} onValueChange={setFilterTerm}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>{termOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <Input value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-[100px]" />
          </div>
          <div className="space-y-2 flex-1 min-w-[220px]">
            <Label>Exam</Label>
            <Select value={selectedExamId} onValueChange={setSelectedExamId} disabled={exams.length === 0}>
              <SelectTrigger><SelectValue placeholder={exams.length === 0 ? "No exams found" : "Select exam"} /></SelectTrigger>
              <SelectContent>
                {exams.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} {e.is_published ? "✓" : "(draft)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or admission #" className="pl-9" />
          </div>
          <Button variant="outline" onClick={printAll} disabled={filtered.length === 0}>
            <Printer className="mr-1 h-4 w-4" /> Print All
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{selectedExamId ? "No results found for this exam" : "Select an exam to view results"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Adm #</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-center">Subjects</TableHead>
                  <TableHead className="text-center">Average</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                  <TableHead>Report Card</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s: any) => (
                  <TableRow key={s.student?.id}>
                    <TableCell className="font-bold">{s.rank}<span className="text-xs text-muted-foreground font-normal">/{filtered.length}</span></TableCell>
                    <TableCell className="text-xs">{s.student?.admission_number}</TableCell>
                    <TableCell className="font-medium">{s.student?.full_name}</TableCell>
                    <TableCell className="text-center">{s.count}</TableCell>
                    <TableCell className="text-center font-semibold">{s.average.toFixed(1)}%</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={gradeColor(zimGrade(s.average))}>
                        {zimGrade(s.average)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ReportCardDownloadButton
                        studentName={s.student?.full_name || ""}
                        admissionNumber={s.student?.admission_number || ""}
                        form={currentExam?.form_level || s.student?.form || ""}
                        stream={s.student?.stream}
                        examName={currentExam?.name || ""}
                        term={currentExam?.term || ""}
                        academicYear={currentExam?.academic_year || ""}
                        results={s.rows.map((r: any) => ({
                          subject_name: r.subjects?.name || "Unknown",
                          subject_code: r.subjects?.code || null,
                          mark: Number(r.mark) || 0,
                          grade: r.grade || zimGrade(Number(r.mark) || 0),
                          teacher_comment: r.teacher_comment || null,
                          class_rank: null,
                          class_size: null,
                        }))}
                        overallRank={{ rank: s.rank, total: filtered.length }}
                        averageMark={Math.round(s.average * 100) / 100}
                        averageGrade={zimGrade(s.average)}
                        studentId={s.student?.id || null}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
