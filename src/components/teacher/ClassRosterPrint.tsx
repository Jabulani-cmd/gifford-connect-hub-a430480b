// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Download, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { downloadBrandedPdf, printBrandedTable } from "@/lib/export-pdf";
import { useToast } from "@/hooks/use-toast";

interface Props { classes: any[]; }

export default function ClassRosterPrint({ classes }: Props) {
  const { toast } = useToast();
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (classes.length && !classId) setClassId(classes[0].id); }, [classes]);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    (async () => {
      const { data: sc } = await supabase.from("student_classes").select("student_id").eq("class_id", classId);
      const ids = sc?.map(r => r.student_id) || [];
      if (!ids.length) { setStudents([]); setLoading(false); return; }
      const { data } = await supabase
        .from("students")
        .select("id, full_name, admission_number, form, stream, gender, date_of_birth")
        .in("id", ids)
        .eq("status", "active")
        .order("full_name");
      setStudents(data || []);
      setLoading(false);
    })();
  }, [classId]);

  const className = classes.find(c => c.id === classId)?.name || "Class";
  const title = `${className} — Class Roster`;
  const headers = ["#", "Full Name", "Admission #", "Form", "Stream", "Gender", "DOB"];
  const rows = students.map((s, i) => [
    String(i + 1),
    s.full_name,
    s.admission_number || "—",
    s.form || "—",
    s.stream || "—",
    s.gender || "—",
    s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString("en-GB") : "—",
  ]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="font-heading flex items-center gap-2"><Users className="h-5 w-5" /> Class Roster</CardTitle>
            <CardDescription>Print or download the full list of students for any of your classes.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={!rows.length}
              onClick={() => printBrandedTable(title, headers, rows)}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
            <Button size="sm" disabled={!rows.length}
              onClick={() => downloadBrandedPdf(title, headers, rows)}>
              <Download className="h-4 w-4 mr-1" /> Download PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-w-xs space-y-2">
          <Label>Class</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Full Name</th>
                <th className="px-3 py-2 text-left">Adm #</th>
                <th className="px-3 py-2 text-left">Form</th>
                <th className="px-3 py-2 text-left">Stream</th>
                <th className="px-3 py-2 text-left">Gender</th>
                <th className="px-3 py-2 text-left">DOB</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No students found.</td></tr>
              ) : rows.map((r) => (
                <tr key={r[0]} className="border-t">
                  {r.map((c, i) => <td key={i} className="px-3 py-2">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
