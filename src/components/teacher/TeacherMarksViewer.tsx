// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, BookOpen, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SCHOOL_NAME = "Gifford High School";
const SCHOOL_MOTTO = "Hinc Orior — From Here I Arise";

async function getLogoDataUrl(): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/lovable-uploads/a77a73a5-59e1-4ad5-85eb-e513569ad7ae.png";
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    c.getContext("2d")!.drawImage(img, 0, 0);
    return c.toDataURL("image/png");
  } catch { return null; }
}

function printTable(title: string, headers: string[], rows: string[][]) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<html><head><title>${title}</title><style>
    body{font-family:Arial,sans-serif;padding:20px}
    .header{text-align:center;margin-bottom:20px}
    .header img{height:60px;margin-bottom:6px}
    .header h1{margin:0;font-size:18px;color:#800000}
    .header p{margin:2px 0;font-size:12px;color:#555}
    table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
    th{background:#800000;color:#fff;padding:8px 6px;text-align:left}
    td{padding:6px;border-bottom:1px solid #ddd}
    tr:nth-child(even){background:#f9f5f5}
    .footer{margin-top:20px;text-align:center;font-size:10px;color:#999}
    @media print{.no-print{display:none}}
  </style></head><body>
  <div class="header">
    <img src="/lovable-uploads/a77a73a5-59e1-4ad5-85eb-e513569ad7ae.png" />
    <h1>${SCHOOL_NAME}</h1>
    <p>${SCHOOL_MOTTO}</p>
    <p style="font-weight:bold;margin-top:8px">${title}</p>
    <p>Generated: ${new Date().toLocaleDateString()}</p>
  </div>
  <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>
  <div class="footer">© ${new Date().getFullYear()} ${SCHOOL_NAME}</div>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

async function downloadPdf(title: string, headers: string[], rows: string[][]) {
  const logo = await getLogoDataUrl();
  const doc = new jsPDF({ orientation: headers.length > 6 ? "landscape" : "portrait" });
  const pw = doc.internal.pageSize.getWidth();
  let y = 15;
  if (logo) { doc.addImage(logo, "PNG", pw / 2 - 10, y, 20, 20); y += 24; }
  doc.setFontSize(16); doc.setTextColor(128, 0, 0);
  doc.text(SCHOOL_NAME, pw / 2, y, { align: "center" }); y += 6;
  doc.setFontSize(9); doc.setTextColor(100);
  doc.text(SCHOOL_MOTTO, pw / 2, y, { align: "center" }); y += 8;
  doc.setFontSize(12); doc.setTextColor(0);
  doc.text(title, pw / 2, y, { align: "center" }); y += 4;
  doc.setDrawColor(128, 0, 0); doc.setLineWidth(0.5);
  doc.line(14, y, pw - 14, y); y += 4;
  autoTable(doc, {
    startY: y, head: [headers], body: rows, theme: "grid",
    headStyles: { fillColor: [128, 0, 0], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [249, 245, 245] },
    didDrawPage: (data) => {
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, pw / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
    }
  });
  doc.save(`${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
}

interface Props {
  userId: string;
  classes: any[];
  subjects: any[];
}

function zimGrade(mark: number): string {
  if (mark >= 90) return "A*";
  if (mark >= 80) return "A";
  if (mark >= 70) return "B";
  if (mark >= 60) return "C";
  if (mark >= 50) return "D";
  if (mark >= 40) return "E";
  return "U";
}

function gradeColor(grade: string): string {
  switch (grade) {
    case "A*": return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "A": return "bg-green-100 text-green-800 border-green-300";
    case "B": return "bg-blue-100 text-blue-800 border-blue-300";
    case "C": return "bg-sky-100 text-sky-800 border-sky-300";
    case "D": return "bg-amber-100 text-amber-800 border-amber-300";
    case "E": return "bg-orange-100 text-orange-800 border-orange-300";
    case "U": return "bg-red-100 text-red-800 border-red-300";
    default: return "bg-muted text-muted-foreground";
  }
}

export default function TeacherMarksViewer({ userId, classes, subjects }: Props) {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedTerm, setSelectedTerm] = useState("all");
  const [search, setSearch] = useState("");
  const [marks, setMarks] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"individual" | "group">("group");

  useEffect(() => {
    if (classes.length > 0 && !selectedClass) setSelectedClass(classes[0].id);
  }, [classes]);

  useEffect(() => {
    if (selectedClass) loadData();
  }, [selectedClass]);

  const loadData = async () => {
    setLoading(true);
    const { data: sc } = await supabase.from("student_classes").select("student_id").eq("class_id", selectedClass);
    const studentIds = sc?.map(s => s.student_id) || [];

    if (studentIds.length > 0) {
      const { data: studs } = await supabase.from("students").select("id, full_name, admission_number").in("id", studentIds).eq("status", "active").order("full_name");
      if (studs) setStudents(studs);

      const { data: m } = await supabase.from("marks").select("*, subjects(name)").in("student_id", studentIds).order("created_at", { ascending: false });
      setMarks(m || []);
    } else {
      setStudents([]);
      setMarks([]);
    }
    setLoading(false);
  };

  const filtered = marks.filter(m => {
    if (selectedSubject !== "all" && m.subject_id !== selectedSubject) return false;
    if (selectedTerm !== "all" && m.term !== selectedTerm) return false;
    return true;
  });

  const searchedStudents = students.filter(s =>
    !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.admission_number?.toLowerCase().includes(search.toLowerCase())
  );

  // Group view: per-student summary
  const studentSummaries = searchedStudents.map(s => {
    const sMarks = filtered.filter(m => m.student_id === s.id);
    const avg = sMarks.length > 0 ? Math.round(sMarks.reduce((a, m) => a + m.mark, 0) / sMarks.length) : null;
    return { ...s, marks: sMarks, avg, count: sMarks.length };
  }).sort((a, b) => (b.avg || 0) - (a.avg || 0));

  const classAvg = studentSummaries.filter(s => s.avg !== null).length > 0
    ? Math.round(studentSummaries.filter(s => s.avg !== null).reduce((a, s) => a + (s.avg || 0), 0) / studentSummaries.filter(s => s.avg !== null).length)
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5" /> Student Marks Viewer
        </h2>
        <p className="text-sm text-muted-foreground">View marks for individual students or as a class group.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Select class" /></SelectTrigger>
          <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Subjects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Terms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Terms</SelectItem>
            <SelectItem value="Term 1">Term 1</SelectItem>
            <SelectItem value="Term 2">Term 2</SelectItem>
            <SelectItem value="Term 3">Term 3</SelectItem>
          </SelectContent>
        </Select>
        <Select value={viewMode} onValueChange={v => setViewMode(v as any)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="group">Group View</SelectItem>
            <SelectItem value="individual">Individual View</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search student by name or admission number..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {classAvg !== null && (
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{classAvg}%</p>
            <p className="text-xs text-muted-foreground">Class Average</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{searchedStudents.length}</p>
            <p className="text-xs text-muted-foreground">Students</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">Total Marks</p>
          </CardContent></Card>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : searchedStudents.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No students found.</p>
        </CardContent></Card>
      ) : viewMode === "group" ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">#</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Student</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Adm #</th>
                    <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Tests</th>
                    <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Average</th>
                    <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {studentSummaries.map((s, i) => {
                    const grade = s.avg !== null ? zimGrade(s.avg) : null;
                    return (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => { setViewMode("individual"); setSearch(s.full_name); }}>
                        <td className="px-3 py-3 text-muted-foreground font-bold">{i + 1}</td>
                        <td className="px-3 py-3 font-medium">{s.full_name}</td>
                        <td className="px-3 py-3 text-muted-foreground">{s.admission_number}</td>
                        <td className="px-3 py-3 text-center">{s.count}</td>
                        <td className="px-3 py-3 text-center font-bold">{s.avg !== null ? `${s.avg}%` : "—"}</td>
                        <td className="px-3 py-3 text-center">
                          {grade && <Badge className={`text-xs ${gradeColor(grade)}`} variant="outline">{grade}</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {searchedStudents.map(s => {
            const sMarks = filtered.filter(m => m.student_id === s.id);
            if (sMarks.length === 0) return null;
            const avg = Math.round(sMarks.reduce((a, m) => a + m.mark, 0) / sMarks.length);
            return (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">{s.full_name}</CardTitle>
                      <CardDescription>{s.admission_number} • Average: <span className="font-bold text-primary">{avg}% ({zimGrade(avg)})</span></CardDescription>
                    </div>
                    <Badge className={`${gradeColor(zimGrade(avg))}`} variant="outline">{zimGrade(avg)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Subject</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                          <th className="px-3 py-2 text-center font-medium text-muted-foreground">Type</th>
                          <th className="px-3 py-2 text-center font-medium text-muted-foreground">Term</th>
                          <th className="px-3 py-2 text-center font-medium text-muted-foreground">Date</th>
                          <th className="px-3 py-2 text-center font-medium text-muted-foreground">Mark</th>
                          <th className="px-3 py-2 text-center font-medium text-muted-foreground">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sMarks.map(m => {
                          const g = zimGrade(m.mark);
                          return (
                            <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="px-3 py-2">{m.subjects?.name || "—"}</td>
                              <td className="px-3 py-2 text-muted-foreground">{m.description || m.comment || "—"}</td>
                              <td className="px-3 py-2 text-center capitalize">{m.assessment_type}</td>
                              <td className="px-3 py-2 text-center">{m.term}</td>
                              <td className="px-3 py-2 text-center text-muted-foreground text-xs">{new Date(m.created_at).toLocaleDateString()}</td>
                              <td className="px-3 py-2 text-center font-bold">{m.mark}%</td>
                              <td className="px-3 py-2 text-center"><Badge className={`text-xs ${gradeColor(g)}`} variant="outline">{g}</Badge></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
