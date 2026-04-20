// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, CalendarRange, CalendarCheck2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { downloadBrandedPdf, printBrandedTable } from "@/lib/export-pdf";
import { useToast } from "@/hooks/use-toast";

interface Props {
  classes: any[];
}

const STATUS_LABELS: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

export default function AttendanceReports({ classes }: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"day" | "range">("day");
  const [classId, setClassId] = useState<string>("");
  const [day, setDay] = useState<string>(new Date().toISOString().slice(0, 10));
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const [from, setFrom] = useState<string>(monthAgo);
  const [to, setTo] = useState<string>(today);
  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (classes.length && !classId) setClassId(classes[0].id);
  }, [classes]);

  const className = useMemo(() => classes.find(c => c.id === classId)?.name || "Class", [classId, classes]);

  const load = async () => {
    if (!classId) {
      toast({ title: "Choose a class first", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: sc } = await supabase.from("student_classes").select("student_id").eq("class_id", classId);
      const studentIds = sc?.map(r => r.student_id) || [];
      if (!studentIds.length) {
        setStudents([]); setRecords([]); setLoading(false);
        toast({ title: "No students in this class" });
        return;
      }
      const { data: studs } = await supabase
        .from("students")
        .select("id, full_name, admission_number, form, stream")
        .in("id", studentIds)
        .order("full_name");
      setStudents(studs || []);

      let q = supabase.from("attendance").select("*").eq("class_id", classId);
      if (mode === "day") {
        q = q.eq("attendance_date", day);
      } else {
        q = q.gte("attendance_date", from).lte("attendance_date", to);
      }
      const { data: att } = await q.order("attendance_date", { ascending: true });
      setRecords(att || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (classId) load(); /* eslint-disable-next-line */ }, [classId, mode]);

  // ---- DAY VIEW DATA ----
  const dayRows = students.map((s, i) => {
    const rec = records.find(r => r.student_id === s.id);
    return {
      idx: i + 1,
      name: s.full_name,
      adm: s.admission_number || "—",
      status: rec?.status ? STATUS_LABELS[rec.status] || rec.status : "Not marked",
      notes: rec?.notes || "",
    };
  });

  const dayCounts = {
    present: records.filter(r => r.status === "present").length,
    absent: records.filter(r => r.status === "absent").length,
    late: records.filter(r => r.status === "late").length,
    excused: records.filter(r => r.status === "excused").length,
    notMarked: students.length - records.length,
  };

  // ---- RANGE VIEW: per-student summary ----
  const rangeRows = students.map((s, i) => {
    const rs = records.filter(r => r.student_id === s.id);
    const present = rs.filter(r => r.status === "present").length;
    const absent = rs.filter(r => r.status === "absent").length;
    const late = rs.filter(r => r.status === "late").length;
    const excused = rs.filter(r => r.status === "excused").length;
    const total = rs.length;
    const pct = total ? Math.round(((present + late) / total) * 100) : 0;
    return {
      idx: i + 1,
      name: s.full_name,
      adm: s.admission_number || "—",
      total, present, absent, late, excused, pct,
    };
  });

  // ---- EXPORT ----
  const buildExport = () => {
    if (mode === "day") {
      const title = `${className} — Attendance Register (${new Date(day).toLocaleDateString("en-GB")})`;
      const headers = ["#", "Student", "Adm #", "Status", "Notes"];
      const rows = dayRows.map(r => [String(r.idx), r.name, r.adm, r.status, r.notes]);
      // Append summary row
      rows.push([
        "",
        `Summary — Present: ${dayCounts.present}, Absent: ${dayCounts.absent}, Late: ${dayCounts.late}, Excused: ${dayCounts.excused}, Not marked: ${dayCounts.notMarked}`,
        "", "", "",
      ]);
      return { title, headers, rows };
    }
    const title = `${className} — Attendance Summary (${new Date(from).toLocaleDateString("en-GB")} – ${new Date(to).toLocaleDateString("en-GB")})`;
    const headers = ["#", "Student", "Adm #", "Days", "Present", "Absent", "Late", "Excused", "Attendance %"];
    const rows = rangeRows.map(r => [
      String(r.idx), r.name, r.adm, String(r.total),
      String(r.present), String(r.absent), String(r.late), String(r.excused), `${r.pct}%`,
    ]);
    return { title, headers, rows };
  };

  const handlePrint = () => {
    const d = buildExport();
    if (!d.rows.length) {
      toast({ title: "No data to print", variant: "destructive" });
      return;
    }
    printBrandedTable(d.title, d.headers, d.rows);
  };

  const handleDownload = async () => {
    const d = buildExport();
    if (!d.rows.length) {
      toast({ title: "No data to download", variant: "destructive" });
      return;
    }
    await downloadBrandedPdf(d.title, d.headers, d.rows);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="font-heading flex items-center gap-2">
              <CalendarCheck2 className="h-5 w-5" /> Attendance Reports
            </CardTitle>
            <CardDescription>Print or download attendance for any class — by single day or date range.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
            <Button size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" /> Download PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList>
            <TabsTrigger value="day"><CalendarCheck2 className="h-4 w-4 mr-1" /> Single Day</TabsTrigger>
            <TabsTrigger value="range"><CalendarRange className="h-4 w-4 mr-1" /> Date Range</TabsTrigger>
          </TabsList>

          <TabsContent value="day" className="space-y-4 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={day} onChange={e => setDay(e.target.value)} max={today} />
              </div>
              <div className="flex items-end">
                <Button onClick={load} disabled={loading} variant="secondary" className="w-full">
                  {loading ? "Loading…" : "Refresh"}
                </Button>
              </div>
            </div>

            {students.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <Badge variant="secondary" className="py-2 justify-center">Present: {dayCounts.present}</Badge>
                <Badge variant="destructive" className="py-2 justify-center">Absent: {dayCounts.absent}</Badge>
                <Badge variant="outline" className="py-2 justify-center">Late: {dayCounts.late}</Badge>
                <Badge variant="outline" className="py-2 justify-center">Excused: {dayCounts.excused}</Badge>
                <Badge variant="outline" className="py-2 justify-center">Not marked: {dayCounts.notMarked}</Badge>
              </div>
            )}

            <div className="overflow-x-auto rounded border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Student</th>
                    <th className="px-3 py-2 text-left">Adm #</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {dayRows.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      Choose a class to load students.
                    </td></tr>
                  ) : dayRows.map(r => (
                    <tr key={r.idx} className="border-t">
                      <td className="px-3 py-2 text-muted-foreground">{r.idx}</td>
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.adm}</td>
                      <td className="px-3 py-2">{r.status}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="range" className="space-y-4 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>From</Label>
                <Input type="date" value={from} onChange={e => setFrom(e.target.value)} max={to} />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input type="date" value={to} onChange={e => setTo(e.target.value)} max={today} min={from} />
              </div>
              <div className="flex items-end">
                <Button onClick={load} disabled={loading} variant="secondary" className="w-full">
                  {loading ? "Loading…" : "Generate"}
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Student</th>
                    <th className="px-3 py-2 text-left">Adm #</th>
                    <th className="px-3 py-2 text-center">Days</th>
                    <th className="px-3 py-2 text-center">Present</th>
                    <th className="px-3 py-2 text-center">Absent</th>
                    <th className="px-3 py-2 text-center">Late</th>
                    <th className="px-3 py-2 text-center">Excused</th>
                    <th className="px-3 py-2 text-center">Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {rangeRows.length === 0 ? (
                    <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No students loaded.</td></tr>
                  ) : rangeRows.map(r => (
                    <tr key={r.idx} className="border-t">
                      <td className="px-3 py-2 text-muted-foreground">{r.idx}</td>
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.adm}</td>
                      <td className="px-3 py-2 text-center">{r.total}</td>
                      <td className="px-3 py-2 text-center text-emerald-700">{r.present}</td>
                      <td className="px-3 py-2 text-center text-red-700">{r.absent}</td>
                      <td className="px-3 py-2 text-center text-amber-700">{r.late}</td>
                      <td className="px-3 py-2 text-center">{r.excused}</td>
                      <td className="px-3 py-2 text-center font-bold">{r.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
