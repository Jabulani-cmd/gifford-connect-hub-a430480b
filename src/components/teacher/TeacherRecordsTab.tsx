// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, Printer, Search, Users, BarChart3, Calendar, CheckCircle2, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getLogoDataUrl, SCHOOL_NAME, SCHOOL_MOTTO, SCHOOL_ADDRESS } from "@/lib/finance/pdf";

interface Props {
  userId: string;
  classes: any[];
  subjects: any[];
  staffId?: string;
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

function printHtmlTable(title: string, headers: string[], rows: string[][], logoUrl: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  const now = new Date().toLocaleDateString("en-GB");
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
    .header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #800000; padding-bottom: 12px; margin-bottom: 16px; }
    .header img { width: 70px; height: 70px; object-fit: contain; }
    .header-text h1 { font-size: 20px; margin: 0; color: #000; }
    .header-text p { font-size: 11px; color: #555; margin: 2px 0; }
    .header-text .motto { font-style: italic; color: #800000; }
    h2 { font-size: 15px; color: #333; margin: 0 0 4px; }
    .meta { font-size: 11px; color: #888; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #ccc; padding: 5px 7px; text-align: left; }
    th { background: #800000; color: #fff; font-weight: bold; font-size: 10px; }
    tr:nth-child(even) { background: #f9f5f5; }
    .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 10px; color: #888; text-align: center; }
    @media print { body { padding: 10px; } .header { border-bottom-width: 2px; } }
  </style></head><body>
  <div class="header">
    <img src="${logoUrl}" alt="School Logo" />
    <div class="header-text">
      <h1>${SCHOOL_NAME}</h1>
      <p class="motto">${SCHOOL_MOTTO}</p>
      <p>${SCHOOL_ADDRESS}</p>
    </div>
  </div>
  <h2>${title}</h2><p class="meta">Generated on ${now}</p>
  <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table>
  <div class="footer">${SCHOOL_NAME} · ${SCHOOL_ADDRESS} · Document generated on ${now}</div>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

async function downloadPdf(title: string, headers: string[], rows: string[][]) {
  const logoDataUrl = await getLogoDataUrl();
  const doc = new jsPDF({ orientation: rows[0]?.length > 6 ? "landscape" : "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleDateString("en-GB");

  // Header with logo
  try {
    doc.addImage(logoDataUrl, "PNG", 14, 8, 18, 18);
  } catch {}
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(SCHOOL_NAME, 36, 16);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(128, 0, 0);
  doc.text(SCHOOL_MOTTO, 36, 21);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text(SCHOOL_ADDRESS, 36, 26);

  // Maroon line
  doc.setDrawColor(128, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(14, 30, pageWidth - 14, 30);

  // Title
  doc.setFontSize(13);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 38);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`Generated on ${now}`, 14, 43);

  // Table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 47,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.3 },
    headStyles: { fillColor: [128, 0, 0], textColor: 255, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [249, 245, 245] },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer on every page
      const pageH = doc.internal.pageSize.getHeight();
      doc.setDrawColor(200);
      doc.setLineWidth(0.3);
      doc.line(14, pageH - 14, pageWidth - 14, pageH - 14);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`${SCHOOL_NAME} · ${SCHOOL_ADDRESS}`, 14, pageH - 9);
      doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - 14, pageH - 9, { align: "right" });
    },
  });

  doc.save(`${title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export default function TeacherRecordsTab({ userId, classes, subjects, staffId }: Props) {
  const { toast } = useToast();
  const activeTeacherIds = [userId, staffId].filter(Boolean) as string[];

  // Attendance state
  const [attClass, setAttClass] = useState("");
  const [attFrom, setAttFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [attTo, setAttTo] = useState(new Date().toISOString().slice(0, 10));
  const [attRecords, setAttRecords] = useState<any[]>([]);
  const [attLoading, setAttLoading] = useState(false);

  // Marks state
  const [marksClass, setMarksClass] = useState("");
  const [marksSubject, setMarksSubject] = useState("");
  const [marksTerm, setMarksTerm] = useState("Term 1");
  const [marksData, setMarksData] = useState<any[]>([]);
  const [marksLoading, setMarksLoading] = useState(false);

  // Students state
  const [studentsClass, setStudentsClass] = useState("");
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsSearch, setStudentsSearch] = useState("");

  // Timetable state
  const [ttClass, setTtClass] = useState("");
  const [ttData, setTtData] = useState<any[]>([]);
  const [ttLoading, setTtLoading] = useState(false);

  // Fetch attendance records
  const fetchAttendance = async () => {
    if (!attClass) return;
    setAttLoading(true);
    const { data, error } = await supabase
      .from("attendance")
      .select("*, students(full_name, admission_number)")
      .eq("class_id", attClass)
      .gte("attendance_date", attFrom)
      .lte("attendance_date", attTo)
      .order("attendance_date", { ascending: false });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setAttRecords(data || []);
    setAttLoading(false);
  };

  // Fetch marks
  const fetchMarks = async () => {
    if (!marksSubject) return;
    setMarksLoading(true);
    let q = supabase
      .from("marks")
      .select("*, students(full_name, admission_number), subjects(name)")
      .eq("subject_id", marksSubject)
      .eq("term", marksTerm)
      .in("teacher_id", activeTeacherIds)
      .order("created_at", { ascending: false });
    
    // If class selected, filter by students in that class
    if (marksClass) {
      const { data: sc } = await supabase.from("student_classes").select("student_id").eq("class_id", marksClass);
      const studentIds = (sc || []).map(s => s.student_id);
      if (studentIds.length > 0) q = q.in("student_id", studentIds);
      else { setMarksData([]); setMarksLoading(false); return; }
    }
    
    const { data, error } = await q;
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setMarksData(data || []);
    setMarksLoading(false);
  };

  // Fetch students in class
  const fetchStudents = async () => {
    if (!studentsClass) return;
    setStudentsLoading(true);
    const { data: sc } = await supabase.from("student_classes").select("student_id").eq("class_id", studentsClass);
    const studentIds = (sc || []).map(s => s.student_id);
    if (studentIds.length === 0) { setStudentsData([]); setStudentsLoading(false); return; }
    const { data, error } = await supabase.from("students").select("*").in("id", studentIds).order("full_name");
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setStudentsData(data || []);
    setStudentsLoading(false);
  };

  // Fetch timetable
  const fetchTimetable = async () => {
    if (!ttClass) return;
    setTtLoading(true);
    const { data, error } = await supabase
      .from("timetable_entries")
      .select("*, subjects(name), staff(full_name)")
      .eq("class_id", ttClass)
      .order("day_of_week")
      .order("start_time");
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setTtData(data || []);
    setTtLoading(false);
  };

  useEffect(() => { if (attClass) fetchAttendance(); }, [attClass, attFrom, attTo]);
  useEffect(() => { if (marksSubject) fetchMarks(); }, [marksSubject, marksClass, marksTerm]);
  useEffect(() => { if (studentsClass) fetchStudents(); }, [studentsClass]);
  useEffect(() => { if (ttClass) fetchTimetable(); }, [ttClass]);

  const className = (id: string) => classes.find(c => c.id === id)?.name || "";
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // Attendance print/download
  const attHeaders = ["Date", "Student", "Adm No", "Status", "Notes"];
  const attRows = attRecords.map(r => [
    new Date(r.attendance_date).toLocaleDateString("en-GB"),
    r.students?.full_name || "",
    r.students?.admission_number || "",
    r.status,
    r.notes || ""
  ]);

  // Marks print/download
  const mHeaders = ["Student", "Adm No", "Subject", "Mark", "Grade", "Type", "Term", "Comment"];
  const mRows = marksData.map(m => [
    m.students?.full_name || "",
    m.students?.admission_number || "",
    m.subjects?.name || "",
    String(m.mark),
    zimGrade(m.mark),
    m.assessment_type,
    m.term,
    m.comment || ""
  ]);

  // Students print/download
  const filteredStudents = studentsData.filter(s =>
    !studentsSearch || s.full_name?.toLowerCase().includes(studentsSearch.toLowerCase()) || s.admission_number?.toLowerCase().includes(studentsSearch.toLowerCase())
  );
  const sHeaders = ["#", "Full Name", "Adm No", "Gender", "Form", "DOB", "Status"];
  const sRows = filteredStudents.map((s, i) => [
    String(i + 1),
    s.full_name || "",
    s.admission_number || "",
    s.gender || "",
    s.form || "",
    s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString("en-GB") : "",
    s.status || ""
  ]);

  // Timetable print/download
  const ttHeaders = ["Day", "Time", "Subject", "Teacher", "Room"];
  const ttRows = ttData.map(t => [
    days[t.day_of_week - 1] || `Day ${t.day_of_week}`,
    `${t.start_time} - ${t.end_time}`,
    t.subjects?.name || "",
    t.staff?.full_name || "",
    t.room || ""
  ]);

  const [logoUrl, setLogoUrl] = useState("");
  useEffect(() => { getLogoDataUrl().then(setLogoUrl); }, []);

  const ActionButtons = ({ title, headers, rows, count }: { title: string; headers: string[]; rows: string[][]; count: number }) => (
    <div className="flex gap-2 flex-wrap">
      <Badge variant="secondary">{count} records</Badge>
      <Button variant="outline" size="sm" onClick={() => printHtmlTable(title, headers, rows, logoUrl)} disabled={count === 0}>
        <Printer className="h-3.5 w-3.5 mr-1" /> Print
      </Button>
      <Button variant="outline" size="sm" onClick={() => downloadPdf(title, headers, rows)} disabled={count === 0}>
        <Download className="h-3.5 w-3.5 mr-1" /> Download PDF
      </Button>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Records & Reports</CardTitle>
        <CardDescription>View, print and download attendance, marks, class lists and timetables.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="attendance" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="attendance"><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Attendance</TabsTrigger>
            <TabsTrigger value="marks"><BarChart3 className="mr-1 h-3.5 w-3.5" /> Marks</TabsTrigger>
            <TabsTrigger value="students"><Users className="mr-1 h-3.5 w-3.5" /> Class Lists</TabsTrigger>
            <TabsTrigger value="timetable"><Calendar className="mr-1 h-3.5 w-3.5" /> Timetables</TabsTrigger>
          </TabsList>

          {/* ATTENDANCE RECORDS */}
          <TabsContent value="attendance" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Class</Label>
                <Select value={attClass} onValueChange={setAttClass}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="date" value={attFrom} onChange={e => setAttFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input type="date" value={attTo} onChange={e => setAttTo(e.target.value)} />
              </div>
            </div>
            {attClass && (
              <ActionButtons title={`Attendance_${className(attClass)}_${attFrom}_to_${attTo}`} headers={attHeaders} rows={attRows} count={attRecords.length} />
            )}
            {attLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : attRecords.length > 0 ? (
              <div className="max-h-[400px] overflow-auto border rounded">
                <Table>
                  <TableHeader><TableRow>
                    {attHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}
                  </TableRow></TableHeader>
                  <TableBody>
                    {attRecords.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>{new Date(r.attendance_date).toLocaleDateString("en-GB")}</TableCell>
                        <TableCell className="font-medium">{r.students?.full_name}</TableCell>
                        <TableCell>{r.students?.admission_number}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === "present" ? "default" : r.status === "late" ? "secondary" : "destructive"}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{r.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : attClass ? <p className="text-sm text-muted-foreground py-4 text-center">No attendance records found for this period.</p> : null}
          </TabsContent>

          {/* MARKS RECORDS */}
          <TabsContent value="marks" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Subject *</Label>
                <Select value={marksSubject} onValueChange={setMarksSubject}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Class (optional)</Label>
                <Select value={marksClass} onValueChange={setMarksClass}>
                  <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Term</Label>
                <Select value={marksTerm} onValueChange={setMarksTerm}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Term 1">Term 1</SelectItem>
                    <SelectItem value="Term 2">Term 2</SelectItem>
                    <SelectItem value="Term 3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {marksSubject && (
              <ActionButtons title={`Marks_${marksTerm}`} headers={mHeaders} rows={mRows} count={marksData.length} />
            )}
            {marksLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : marksData.length > 0 ? (
              <div className="max-h-[400px] overflow-auto border rounded">
                <Table>
                  <TableHeader><TableRow>
                    {mHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}
                  </TableRow></TableHeader>
                  <TableBody>
                    {marksData.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.students?.full_name}</TableCell>
                        <TableCell>{m.students?.admission_number}</TableCell>
                        <TableCell>{m.subjects?.name}</TableCell>
                        <TableCell className="font-bold">{m.mark}%</TableCell>
                        <TableCell><Badge variant="outline">{zimGrade(m.mark)}</Badge></TableCell>
                        <TableCell className="capitalize">{m.assessment_type}</TableCell>
                        <TableCell>{m.term}</TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">{m.comment}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : marksSubject ? <p className="text-sm text-muted-foreground py-4 text-center">No marks found for this selection.</p> : null}
          </TabsContent>

          {/* CLASS LISTS */}
          <TabsContent value="students" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Class</Label>
                <Select value={studentsClass} onValueChange={setStudentsClass}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search name or adm no..." value={studentsSearch} onChange={e => setStudentsSearch(e.target.value)} className="pl-9" />
                </div>
              </div>
            </div>
            {studentsClass && (
              <ActionButtons title={`Class_List_${className(studentsClass)}`} headers={sHeaders} rows={sRows} count={filteredStudents.length} />
            )}
            {studentsLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : filteredStudents.length > 0 ? (
              <div className="max-h-[400px] overflow-auto border rounded">
                <Table>
                  <TableHeader><TableRow>
                    {sHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredStudents.map((s, i) => (
                      <TableRow key={s.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{s.full_name}</TableCell>
                        <TableCell>{s.admission_number}</TableCell>
                        <TableCell className="capitalize">{s.gender}</TableCell>
                        <TableCell>{s.form}</TableCell>
                        <TableCell>{s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString("en-GB") : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : studentsClass ? <p className="text-sm text-muted-foreground py-4 text-center">No students found in this class.</p> : null}
          </TabsContent>

          {/* TIMETABLE */}
          <TabsContent value="timetable" className="space-y-4">
            <div className="space-y-1 max-w-xs">
              <Label className="text-xs">Class</Label>
              <Select value={ttClass} onValueChange={setTtClass}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {ttClass && (
              <ActionButtons title={`Timetable_${className(ttClass)}`} headers={ttHeaders} rows={ttRows} count={ttData.length} />
            )}
            {ttLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : ttData.length > 0 ? (
              <div className="max-h-[400px] overflow-auto border rounded">
                <Table>
                  <TableHeader><TableRow>
                    {ttHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}
                  </TableRow></TableHeader>
                  <TableBody>
                    {ttData.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{days[t.day_of_week - 1] || `Day ${t.day_of_week}`}</TableCell>
                        <TableCell>{t.start_time} - {t.end_time}</TableCell>
                        <TableCell>{t.subjects?.name || "—"}</TableCell>
                        <TableCell>{t.staff?.full_name || "—"}</TableCell>
                        <TableCell>{t.room || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : ttClass ? <p className="text-sm text-muted-foreground py-4 text-center">No timetable entries found for this class.</p> : null}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
