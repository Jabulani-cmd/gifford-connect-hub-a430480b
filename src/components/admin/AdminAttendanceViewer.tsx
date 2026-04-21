// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, CheckCircle2, XCircle, Clock, AlertCircle, Users, Calendar, Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function AdminAttendanceViewer() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("all");
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ total: 0, present: 0, absent: 0, late: 0, excused: 0 });

  useEffect(() => {
    supabase.from("classes").select("*").order("name").then(({ data }) => {
      if (data) setClasses(data);
    });
  }, []);

  // Load students when class changes
  useEffect(() => {
    setSelectedStudent("all");
    if (!selectedClass) { setStudents([]); return; }
    supabase
      .from("student_classes")
      .select("students:student_id(id, full_name, admission_number)")
      .eq("class_id", selectedClass)
      .then(({ data }) => {
        const list = (data || []).map((r: any) => r.students).filter(Boolean);
        list.sort((a: any, b: any) => (a.full_name || "").localeCompare(b.full_name || ""));
        setStudents(list);
      });
  }, [selectedClass]);

  const fetchAttendance = async () => {
    if (!selectedClass) {
      toast({ title: "Please select a class", variant: "destructive" });
      return;
    }
    setLoading(true);
    let query = supabase
      .from("attendance")
      .select("*, students:student_id(id, full_name, admission_number)")
      .eq("class_id", selectedClass)
      .gte("attendance_date", dateFrom)
      .lte("attendance_date", dateTo)
      .order("attendance_date", { ascending: false });

    if (selectedStudent !== "all") {
      query = query.eq("student_id", selectedStudent);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: "Error fetching attendance", description: error.message, variant: "destructive" });
    } else {
      setRecords(data || []);
      const total = data?.length || 0;
      const present = data?.filter(r => r.status === "present").length || 0;
      const absent = data?.filter(r => r.status === "absent").length || 0;
      const late = data?.filter(r => r.status === "late").length || 0;
      const excused = data?.filter(r => r.status === "excused").length || 0;
      setSummary({ total, present, absent, late, excused });
    }
    setLoading(false);
  };

  const filtered = records.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.students?.full_name?.toLowerCase().includes(term) ||
      r.students?.admission_number?.toLowerCase().includes(term)
    );
  });

  // Per-student statistics across the filtered set
  const perStudentStats = (() => {
    const map = new Map<string, any>();
    for (const r of filtered) {
      const id = r.students?.id || r.student_id;
      if (!id) continue;
      if (!map.has(id)) {
        map.set(id, {
          name: r.students?.full_name || "—",
          admission: r.students?.admission_number || "—",
          total: 0, present: 0, absent: 0, late: 0, excused: 0,
        });
      }
      const s = map.get(id);
      s.total += 1;
      if (s[r.status] !== undefined) s[r.status] += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const statusIcon = (status: string) => {
    switch (status) {
      case "present": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "absent": return <XCircle className="h-4 w-4 text-destructive" />;
      case "late": return <Clock className="h-4 w-4 text-yellow-600" />;
      case "excused": return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default: return null;
    }
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "present": return "default";
      case "absent": return "destructive";
      case "late": return "secondary";
      case "excused": return "outline";
      default: return "default";
    }
  };

  const buildExport = () => {
    const className = classes.find(c => c.id === selectedClass)?.name || "class";
    const studentLabel = selectedStudent === "all"
      ? "All Students"
      : students.find(s => s.id === selectedStudent)?.full_name || "Student";
    const title = `Attendance — ${className} — ${studentLabel} (${dateFrom} to ${dateTo})`;
    const headers = ["Student Name", "Admission No", "Date", "Status", "Notes"];
    const rows = filtered.map(r => [
      r.students?.full_name || "—",
      r.students?.admission_number || "—",
      new Date(r.attendance_date).toLocaleDateString(),
      r.status,
      r.notes || "—",
    ]);
    return { title, headers, rows };
  };

  const exportPDF = async () => {
    if (filtered.length === 0) return;
    const { title, headers, rows } = buildExport();
    const { downloadBrandedPdf } = await import("@/lib/export-pdf");
    await downloadBrandedPdf(title, headers, rows);
  };

  const printRegister = async () => {
    if (filtered.length === 0) return;
    const { title, headers, rows } = buildExport();
    const { printBrandedTable } = await import("@/lib/export-pdf");
    printBrandedTable(title, headers, rows);
  };

  const printStats = async () => {
    if (perStudentStats.length === 0) return;
    const className = classes.find(c => c.id === selectedClass)?.name || "class";
    const title = `Attendance Statistics — ${className} (${dateFrom} to ${dateTo})`;
    const headers = ["Student", "Admission No", "Total", "Present", "Absent", "Late", "Excused", "Attendance %"];
    const rows = perStudentStats.map(s => {
      const pct = s.total > 0 ? (((s.present + s.late) / s.total) * 100).toFixed(1) + "%" : "—";
      return [s.name, s.admission, String(s.total), String(s.present), String(s.absent), String(s.late), String(s.excused), pct];
    });
    const { printBrandedTable } = await import("@/lib/export-pdf");
    printBrandedTable(title, headers, rows);
  };

  const downloadStatsPDF = async () => {
    if (perStudentStats.length === 0) return;
    const className = classes.find(c => c.id === selectedClass)?.name || "class";
    const title = `Attendance Statistics — ${className} (${dateFrom} to ${dateTo})`;
    const headers = ["Student", "Admission No", "Total", "Present", "Absent", "Late", "Excused", "Attendance %"];
    const rows = perStudentStats.map(s => {
      const pct = s.total > 0 ? (((s.present + s.late) / s.total) * 100).toFixed(1) + "%" : "—";
      return [s.name, s.admission, String(s.total), String(s.present), String(s.absent), String(s.late), String(s.excused), pct];
    });
    const { downloadBrandedPdf } = await import("@/lib/export-pdf");
    await downloadBrandedPdf(title, headers, rows);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Attendance Register
          </CardTitle>
          <CardDescription>Filter by class, student, and date range. Print register or per-student statistics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Class *</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedClass}>
                <SelectTrigger><SelectValue placeholder="All students" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All students</SelectItem>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Name or adm no..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={fetchAttendance} disabled={loading}>
              {loading ? "Loading..." : "View Attendance"}
            </Button>
            {records.length > 0 && (
              <>
                <Button variant="outline" onClick={printRegister}>
                  <Printer className="mr-1 h-4 w-4" /> Print Register
                </Button>
                <Button variant="outline" onClick={exportPDF}>
                  <Download className="mr-1 h-4 w-4" /> Download Register PDF
                </Button>
                <Button variant="outline" onClick={printStats}>
                  <Printer className="mr-1 h-4 w-4" /> Print Statistics
                </Button>
                <Button variant="outline" onClick={downloadStatsPDF}>
                  <Download className="mr-1 h-4 w-4" /> Download Stats PDF
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{summary.total}</p>
            <p className="text-xs text-muted-foreground">Total Records</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{summary.present}</p>
            <p className="text-xs text-muted-foreground">Present</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{summary.absent}</p>
            <p className="text-xs text-muted-foreground">Absent</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{summary.late}</p>
            <p className="text-xs text-muted-foreground">Late</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{summary.excused}</p>
            <p className="text-xs text-muted-foreground">Excused</p>
          </CardContent></Card>
        </div>
      )}

      {/* Per-student statistics */}
      {perStudentStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Per-Student Statistics ({perStudentStats.length})</CardTitle>
            <CardDescription>Attendance % counts present + late as attended.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Admission No</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">Absent</TableHead>
                    <TableHead className="text-center">Late</TableHead>
                    <TableHead className="text-center">Excused</TableHead>
                    <TableHead className="text-center">Attendance %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perStudentStats.map(s => {
                    const pct = s.total > 0 ? ((s.present + s.late) / s.total) * 100 : 0;
                    const pctColor = pct >= 90 ? "text-green-600" : pct >= 75 ? "text-yellow-600" : "text-destructive";
                    return (
                      <TableRow key={s.admission}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.admission}</TableCell>
                        <TableCell className="text-center">{s.total}</TableCell>
                        <TableCell className="text-center text-green-600">{s.present}</TableCell>
                        <TableCell className="text-center text-destructive">{s.absent}</TableCell>
                        <TableCell className="text-center text-yellow-600">{s.late}</TableCell>
                        <TableCell className="text-center text-blue-600">{s.excused}</TableCell>
                        <TableCell className={`text-center font-bold ${pctColor}`}>
                          {s.total > 0 ? pct.toFixed(1) + "%" : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results table */}
      {records.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">
              {filtered.length} record{filtered.length !== 1 ? "s" : ""} found
              {searchTerm && ` matching "${searchTerm}"`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Admission No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No records match your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.students?.full_name || "—"}</TableCell>
                        <TableCell>{r.students?.admission_number || "—"}</TableCell>
                        <TableCell>{new Date(r.attendance_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(r.status)} className="gap-1">
                            {statusIcon(r.status)} {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{r.notes || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {records.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p>Select a class (and optionally a student) and date range, then click "View Attendance".</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
