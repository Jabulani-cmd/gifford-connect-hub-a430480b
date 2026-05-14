import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { exam_id, start_date, end_date, session_minutes } = await req.json();
    if (!exam_id || !start_date || !end_date) throw new Error("exam_id, start_date, end_date required");

    const dur = session_minutes || 150;
    const sessions = [
      { label: "Morning", start: "08:00", end: minutesToTime(timeToMinutes("08:00") + dur) },
      { label: "Afternoon", start: "11:00", end: minutesToTime(timeToMinutes("11:00") + dur) },
    ];

    const [{ data: exam }, { data: subjects }, { data: venues }, { data: staff }, { data: tt }] = await Promise.all([
      supabase.from("exams").select("*").eq("id", exam_id).single(),
      supabase.from("subjects").select("id, name, code"),
      supabase.from("teaching_venues").select("id, name, capacity, venue_type").eq("is_active", true).in("venue_type", ["hall", "classroom"]),
      supabase.from("staff").select("id, full_name").eq("status", "active"),
      supabase.from("timetable_entries").select("teacher_id, day_of_week, start_time"),
    ]);
    if (!exam) throw new Error("Exam not found");
    if (!exam.subject_ids?.length) throw new Error("Exam has no subjects configured");
    if (!venues?.length) throw new Error("Add venues marked as Hall first");

    // Build calendar of weekday dates between start and end
    const dates: string[] = [];
    const cur = new Date(start_date);
    const last = new Date(end_date);
    while (cur <= last) {
      const d = cur.getDay();
      if (d >= 1 && d <= 5) dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    if (!dates.length) throw new Error("No weekdays in date range");

    const subjMap = new Map((subjects || []).map((s: any) => [s.id, s]));
    const examSubjects = exam.subject_ids.map((id: string) => subjMap.get(id)).filter(Boolean);
    if (examSubjects.length > dates.length * sessions.length) throw new Error(`Need at least ${examSubjects.length} sessions, have ${dates.length * sessions.length}`);

    const systemPrompt = `You are a school exam scheduler. Schedule each subject exam exactly once.
HARD RULES:
1. One subject per session per form (the form sits one paper at a time).
2. invigilator_staff_id must be unique per (date, session).
3. venue_id must come from provided venues.
4. Spread papers across the week; do not put all on day 1.
Days: ${JSON.stringify(dates)}. Sessions: ${JSON.stringify(sessions)}.`;

    const payload = {
      exam: { id: exam.id, name: exam.name, form_level: exam.form_level },
      subjects: examSubjects,
      dates,
      sessions,
      venues: (venues || []).map((v: any) => ({ id: v.id, name: v.name, capacity: v.capacity })),
      staff: (staff || []).map((s: any) => ({ id: s.id, name: s.full_name })),
    };

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Schedule exams. Inputs:\n${JSON.stringify(payload)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_exam_schedule",
            parameters: {
              type: "object",
              properties: {
                entries: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      subject_id: { type: "string" },
                      exam_date: { type: "string" },
                      start_time: { type: "string" },
                      end_time: { type: "string" },
                      venue_id: { type: "string" },
                      invigilator_staff_id: { type: "string" },
                    },
                    required: ["subject_id", "exam_date", "start_time", "end_time", "venue_id", "invigilator_staff_id"],
                  },
                },
              },
              required: ["entries"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_exam_schedule" } },
      }),
    });
    if (!r.ok) {
      if (r.status === 429) throw new Error("AI rate limit exceeded.");
      if (r.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI error ${r.status}: ${await r.text()}`);
    }
    const j = await r.json();
    const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("AI returned no schedule");
    let entries = JSON.parse(args).entries as any[];

    // Repair: dedupe invigilators per session, ensure each subject scheduled once
    const sessionInv = new Map<string, string>();
    const subjSet = new Set<string>();
    const clean: any[] = [];
    const dropped: string[] = [];
    for (const e of entries) {
      if (subjSet.has(e.subject_id)) continue;
      const key = `${e.exam_date}|${e.start_time}|${e.invigilator_staff_id}`;
      const sessKey = `${e.exam_date}|${e.start_time}`;
      if (sessionInv.has(`${sessKey}|${e.invigilator_staff_id}`)) {
        // pick any other free staff for this session
        const used = new Set(clean.filter((c) => c.exam_date === e.exam_date && c.start_time === e.start_time).map((c) => c.invigilator_staff_id));
        const replacement = (staff || []).map((s: any) => s.id).find((id: string) => !used.has(id));
        if (!replacement) { dropped.push(`no invigilator free at ${sessKey}`); continue; }
        e.invigilator_staff_id = replacement;
      }
      sessionInv.set(`${sessKey}|${e.invigilator_staff_id}`, e.subject_id);
      subjSet.add(e.subject_id);
      clean.push(e);
    }

    const auth = req.headers.get("authorization");
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth || "" } } });
    const { data: ures } = await userClient.auth.getUser();

    await supabase.from("timetable_drafts").delete().eq("draft_type", "exam").eq("scope_id", exam_id);
    const { data: draftRow, error: dErr } = await supabase.from("timetable_drafts").insert({
      draft_type: "exam",
      scope_id: exam_id,
      draft_json: clean,
      meta: { exam_name: exam.name, total: clean.length, missing: examSubjects.length - clean.length, dropped: dropped.length },
      created_by: ures?.user?.id || null,
    }).select().single();
    if (dErr) throw dErr;

    return new Response(JSON.stringify({ draft_id: draftRow.id, entries: clean, meta: draftRow.meta }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-exam-timetable", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function timeToMinutes(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function minutesToTime(min: number) { const h = Math.floor(min / 60); const m = min % 60; return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`; }
