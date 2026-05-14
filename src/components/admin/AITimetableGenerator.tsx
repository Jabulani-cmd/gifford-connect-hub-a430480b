// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Trash2, Plus, Save, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const VENUE_TYPES = ["classroom", "lab", "hall", "field", "other"];

export default function AITimetableGenerator() {
  const { toast } = useToast();
  const [venues, setVenues] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [reqs, setReqs] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [draft, setDraft] = useState<any | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [newVenue, setNewVenue] = useState({ name: "", venue_type: "classroom", capacity: 40 });
  const [reqForm, setReqForm] = useState("Form 1");

  // Term picker (used at generate + publish time)
  const yr = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  const defaultTerm = month <= 4 ? "Term 1" : month <= 8 ? "Term 2" : "Term 3";
  const [academicYear, setAcademicYear] = useState(String(yr));
  const [term, setTerm] = useState(defaultTerm);
  const [termStart, setTermStart] = useState("");
  const [termEnd, setTermEnd] = useState("");

  // Override form
  const [ovForm, setOvForm] = useState({
    override_date: "", class_id: "", start_time: "07:30", end_time: "",
    subject_id: "", teacher_id: "", venue_id: "", reason: "", is_cancelled: false,
  });

  const formLevels = ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"];

  const loadAll = async () => {
    const [{ data: v }, { data: s }, { data: c }, { data: st }, { data: r }, { data: d }, { data: ov }] = await Promise.all([
      supabase.from("teaching_venues").select("*").order("name"),
      supabase.from("subjects").select("id, name, form_levels").order("name"),
      supabase.from("classes").select("id, name, form_level").order("name"),
      supabase.from("staff").select("id, full_name").eq("status", "active").order("full_name"),
      supabase.from("subject_period_requirements").select("*"),
      supabase.from("timetable_drafts").select("*").eq("draft_type", "class").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("timetable_overrides").select("*").order("override_date", { ascending: false }).limit(50),
    ]);
    setVenues(v || []);
    setSubjects(s || []);
    setClasses(c || []);
    setStaff(st || []);
    setReqs(r || []);
    setDraft(d || null);
    setOverrides(ov || []);
  };

  useEffect(() => { loadAll(); }, []);

  const addVenue = async () => {
    if (!newVenue.name.trim()) return;
    const { error } = await supabase.from("teaching_venues").insert(newVenue);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setNewVenue({ name: "", venue_type: "classroom", capacity: 40 });
    loadAll();
  };

  const deleteVenue = async (id: string) => {
    if (!confirm("Permanently delete this venue?")) return;
    await supabase.from("teaching_venues").delete().eq("id", id);
    loadAll();
  };

  const updateReq = async (subject_id: string, periods: number) => {
    const existing = reqs.find((r) => r.form_level === reqForm && r.subject_id === subject_id);
    if (existing) {
      await supabase.from("subject_period_requirements").update({ periods_per_week: periods }).eq("id", existing.id);
    } else {
      await supabase.from("subject_period_requirements").insert({ form_level: reqForm, subject_id, periods_per_week: periods });
    }
    loadAll();
  };

  const formSubjects = subjects.filter((s) => !s.form_levels?.length || s.form_levels.includes(reqForm));

  const generate = async () => {
    if (!termStart || !termEnd) {
      return toast({ title: "Set term dates", description: "Pick the term start and end dates first.", variant: "destructive" });
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-timetable", {
        body: { academic_year: academicYear, term, term_start_date: termStart, term_end_date: termEnd },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Draft generated", description: `${data.meta.cells_total} of ~${data.meta.target_total} cells. ${data.meta.dropped_clashes} clashes auto-resolved.` });
      loadAll();
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const publish = async () => {
    if (!draft) return;
    if (!confirm(`Publish draft for ${classes.length} classes — visible across all portals immediately?`)) return;
    setPublishing(true);
    try {
      const cells = draft.draft_json as any[];
      const m = (draft.meta as any) || {};
      const slots = m.lesson_slots as { start: string; end: string }[];
      const ay = m.academic_year || academicYear;
      const tm = m.term || term;
      const ts = m.term_start_date || termStart || null;
      const te = m.term_end_date || termEnd || null;
      const rows = cells.map((c) => ({
        class_id: c.class_id,
        day_of_week: c.day,
        start_time: slots[c.slot_index].start,
        end_time: slots[c.slot_index].end,
        subject_id: c.subject_id,
        teacher_id: c.teacher_id,
        venue_id: c.venue_id,
        room: venues.find((v) => v.id === c.venue_id)?.name || null,
        academic_year: ay,
        term: tm,
        term_start_date: ts,
        term_end_date: te,
      }));
      const { error: delErr } = await supabase
        .from("timetable_entries")
        .delete()
        .eq("academic_year", ay)
        .eq("term", tm);
      if (delErr) throw delErr;
      if (rows.length) {
        const { error: insErr } = await supabase.from("timetable_entries").insert(rows);
        if (insErr) throw insErr;
      }
      await supabase.from("timetable_drafts").delete().eq("id", draft.id);
      toast({ title: "Published", description: `${rows.length} entries live for ${tm} ${ay}.` });
      setDraft(null);
    } catch (e: any) {
      toast({ title: "Publish failed", description: e.message, variant: "destructive" });
    }
    setPublishing(false);
  };

  const discardDraft = async () => {
    if (!draft || !confirm("Discard this draft?")) return;
    await supabase.from("timetable_drafts").delete().eq("id", draft.id);
    setDraft(null);
  };

  const addOverride = async () => {
    if (!ovForm.override_date || !ovForm.start_time) {
      return toast({ title: "Date & start time required", variant: "destructive" });
    }
    const payload: any = {
      override_date: ovForm.override_date,
      class_id: ovForm.class_id || null,
      start_time: ovForm.start_time,
      end_time: ovForm.end_time || null,
      is_cancelled: ovForm.is_cancelled,
      subject_id: ovForm.is_cancelled ? null : (ovForm.subject_id || null),
      teacher_id: ovForm.is_cancelled ? null : (ovForm.teacher_id || null),
      venue_id: ovForm.is_cancelled ? null : (ovForm.venue_id || null),
      room: ovForm.is_cancelled ? null : (venues.find((v) => v.id === ovForm.venue_id)?.name || null),
      reason: ovForm.reason || null,
      academic_year: academicYear,
      term,
    };
    const { error } = await supabase.from("timetable_overrides").insert(payload);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Override added", description: "Will appear on the chosen date in all portals." });
    setOvForm({ override_date: "", class_id: "", start_time: "07:30", end_time: "", subject_id: "", teacher_id: "", venue_id: "", reason: "", is_cancelled: false });
    loadAll();
  };

  const deleteOverride = async (id: string) => {
    if (!confirm("Permanently delete this override?")) return;
    await supabase.from("timetable_overrides").delete().eq("id", id);
    loadAll();
  };

  // Group draft cells by class for preview
  const draftByClass = (draft?.draft_json || []).reduce((acc: any, c: any) => {
    acc[c.class_id] = (acc[c.class_id] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Card className="border-secondary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <Sparkles className="h-5 w-5 text-secondary" /> AI Timetable Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Inputs: {classes.length} classes · {subjects.length} subjects · {venues.length} venues
          </div>

          {/* Term picker */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-md border bg-muted/20 p-3">
            <div>
              <Label className="text-xs">Academic Year</Label>
              <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="2026" />
            </div>
            <div>
              <Label className="text-xs">Term</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term 1">Term 1</SelectItem>
                  <SelectItem value="Term 2">Term 2</SelectItem>
                  <SelectItem value="Term 3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Term Start</Label>
              <Input type="date" value={termStart} onChange={(e) => setTermStart(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Term End</Label>
              <Input type="date" value={termEnd} onChange={(e) => setTermEnd(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={generate} disabled={generating || !classes.length || !venues.length}>
              {generating ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="mr-1 h-4 w-4" /> Generate Term Timetable</>}
            </Button>
            {draft && (
              <>
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-900 border-yellow-500/40">
                  <AlertTriangle className="mr-1 h-3 w-3" /> DRAFT — {(draft.meta as any)?.term} {(draft.meta as any)?.academic_year}
                </Badge>
                <Button variant="default" onClick={publish} disabled={publishing}>
                  {publishing ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Publishing…</> : <><CheckCircle2 className="mr-1 h-4 w-4" /> Publish to all portals</>}
                </Button>
                <Button variant="outline" onClick={discardDraft}>Discard</Button>
              </>
            )}
          </div>
          {draft && (
            <div className="rounded-md border bg-muted/20 p-3 text-xs">
              <div className="mb-2 font-semibold">Draft preview ({(draft.draft_json as any[]).length} cells)</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {classes.map((c) => (
                  <div key={c.id} className="rounded border bg-background px-2 py-1">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-muted-foreground">{draftByClass[c.id] || 0} cells</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-heading">Teaching Venues</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs">Name</Label>
              <Input value={newVenue.name} onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })} placeholder="Room 12 / Bio Lab / Main Hall" />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={newVenue.venue_type} onValueChange={(v) => setNewVenue({ ...newVenue, venue_type: v })}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{VENUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Capacity</Label>
              <Input type="number" className="w-24" value={newVenue.capacity} onChange={(e) => setNewVenue({ ...newVenue, capacity: parseInt(e.target.value) || 0 })} />
            </div>
            <Button onClick={addVenue}><Plus className="mr-1 h-4 w-4" /> Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {venues.map((v) => (
              <Badge key={v.id} variant="outline" className="gap-1">
                {v.name} <span className="text-muted-foreground">· {v.venue_type} · {v.capacity}</span>
                <button onClick={() => deleteVenue(v.id)} className="ml-1 text-destructive hover:text-destructive/80"><Trash2 className="h-3 w-3" /></button>
              </Badge>
            ))}
            {!venues.length && <span className="text-xs text-muted-foreground">No venues yet — add at least one.</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-heading">Periods per Week (per Form)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Form:</Label>
            <Select value={reqForm} onValueChange={setReqForm}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{formLevels.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {formSubjects.map((s) => {
              const cur = reqs.find((r) => r.form_level === reqForm && r.subject_id === s.id)?.periods_per_week ?? 5;
              return (
                <div key={s.id} className="flex items-center gap-2 rounded border p-2">
                  <span className="flex-1 truncate text-xs">{s.name}</span>
                  <Input type="number" min={1} max={20} className="w-16 h-8" defaultValue={cur} onBlur={(e) => updateReq(s.id, parseInt(e.target.value) || 5)} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
