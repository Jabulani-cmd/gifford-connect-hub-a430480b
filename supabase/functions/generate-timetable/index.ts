import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAYS = [0, 1, 2, 3, 4]; // Mon..Fri (zero-based)

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: classes }, { data: classSubjects }, { data: subjects }, { data: reqs }, { data: slots }, { data: venues }, { data: staff }] = await Promise.all([
      supabase.from("classes").select("id, name, form_level, stream"),
      supabase.from("class_subjects").select("class_id, subject_id, teacher_id"),
      supabase.from("subjects").select("id, name"),
      supabase.from("subject_period_requirements").select("form_level, subject_id, periods_per_week"),
      supabase.from("timetable_time_slots").select("start_time, end_time, slot_type, display_order").eq("slot_type", "lesson").order("display_order"),
      supabase.from("teaching_venues").select("id, name, venue_type, capacity").eq("is_active", true),
      supabase.from("staff").select("id, full_name").eq("status", "active"),
    ]);

    const lessonSlots = (slots && slots.length > 0)
      ? slots.map((s: any) => ({ start: s.start_time.slice(0,5), end: s.end_time.slice(0,5) }))
      : [
          { start: "07:30", end: "08:10" }, { start: "08:10", end: "08:50" }, { start: "08:50", end: "09:30" },
          { start: "09:50", end: "10:30" }, { start: "10:30", end: "11:10" }, { start: "11:10", end: "11:50" },
          { start: "11:50", end: "12:30" }, { start: "12:30", end: "13:10" },
          { start: "13:50", end: "14:30" }, { start: "14:30", end: "15:10" },
        ];

    if (!classes?.length) throw new Error("No classes found. Add classes first.");
    if (!classSubjects?.length) throw new Error("No class-subject assignments. Assign subjects/teachers to classes first.");
    if (!venues?.length) throw new Error("No teaching venues. Add venues in the Venues tab first.");

    const subjMap = new Map((subjects || []).map((s: any) => [s.id, s.name]));
    const staffMap = new Map((staff || []).map((s: any) => [s.id, s.full_name]));
    const venueMap = new Map((venues || []).map((v: any) => [v.id, v.name]));
    const reqMap = new Map<string, number>();
    (reqs || []).forEach((r: any) => reqMap.set(`${r.form_level}|${r.subject_id}`, r.periods_per_week));

    // Build per-class subject requirements
    const classBriefs = classes.map((c: any) => {
      const cs = (classSubjects || []).filter((x: any) => x.class_id === c.id);
      return {
        class_id: c.id,
        class_name: c.name,
        form_level: c.form_level,
        subjects: cs.map((x: any) => ({
          subject_id: x.subject_id,
          subject_name: subjMap.get(x.subject_id) || "?",
          teacher_id: x.teacher_id,
          teacher_name: x.teacher_id ? staffMap.get(x.teacher_id) : null,
          periods_per_week: reqMap.get(`${c.form_level}|${x.subject_id}`) ?? 5,
        })),
      };
    });

    const slotCount = lessonSlots.length;
    const totalCells = classes.length * 5 * slotCount;

    const systemPrompt = `You are an expert school timetable planner. Produce a 5-day weekly class timetable for every class.
HARD RULES (MUST NEVER BE VIOLATED):
1. A teacher cannot be assigned to two different classes in the same (day, slot_index).
2. Only use subject_id/teacher_id pairs from each class's allowed list.
3. Each subject should appear approximately periods_per_week times per class (off by at most 1 if needed).
4. Spread the same subject across different days where possible. Avoid stacking the same subject in 3+ consecutive days.
5. venue_id must come from the provided venues list. Try not to double-book a venue in the same slot.
6. Days are 0=Mon..4=Fri. slot_index is 0..${slotCount - 1}.
Return JSON ONLY through the tool. Empty cells should be omitted.`;

    const userPayload = {
      slot_count: slotCount,
      lesson_slots: lessonSlots,
      venues: (venues || []).map((v: any) => ({ id: v.id, name: v.name, type: v.venue_type })),
      classes: classBriefs,
    };

    const callAI = async (extraRepairContext?: string) => {
      const messages: any[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate the full school timetable. Inputs:\n${JSON.stringify(userPayload)}` },
      ];
      if (extraRepairContext) messages.push({ role: "user", content: extraRepairContext });

      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages,
          tools: [{
            type: "function",
            function: {
              name: "submit_timetable",
              description: "Submit the full-school timetable as a list of cells.",
              parameters: {
                type: "object",
                properties: {
                  cells: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        class_id: { type: "string" },
                        day: { type: "integer", minimum: 0, maximum: 4 },
                        slot_index: { type: "integer", minimum: 0, maximum: slotCount - 1 },
                        subject_id: { type: "string" },
                        teacher_id: { type: "string" },
                        venue_id: { type: "string" },
                      },
                      required: ["class_id", "day", "slot_index", "subject_id", "teacher_id", "venue_id"],
                    },
                  },
                },
                required: ["cells"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "submit_timetable" } },
        }),
      });
      if (!r.ok) {
        if (r.status === 429) throw new Error("AI rate limit exceeded. Try again shortly.");
        if (r.status === 402) throw new Error("AI credits exhausted. Add credits in Lovable Cloud.");
        throw new Error(`AI gateway error ${r.status}: ${await r.text()}`);
      }
      const j = await r.json();
      const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) throw new Error("AI returned no structured cells");
      return JSON.parse(args).cells as any[];
    };

    let cells = await callAI();

    // Deterministic repair pass: drop any cell whose teacher/class isn't valid; resolve teacher clashes by dropping conflicts (admin can re-run).
    const validPair = new Set((classSubjects || []).map((x: any) => `${x.class_id}|${x.subject_id}|${x.teacher_id || ""}`));
    cells = cells.filter((c) => validPair.has(`${c.class_id}|${c.subject_id}|${c.teacher_id || ""}`));

    const teacherSlot = new Map<string, any>();
    const classSlot = new Map<string, any>();
    const clean: any[] = [];
    const dropped: string[] = [];
    for (const c of cells) {
      const cKey = `${c.class_id}|${c.day}|${c.slot_index}`;
      if (classSlot.has(cKey)) { dropped.push(`class duplicate at d${c.day} s${c.slot_index}`); continue; }
      const tKey = `${c.teacher_id}|${c.day}|${c.slot_index}`;
      if (teacherSlot.has(tKey)) { dropped.push(`teacher clash ${staffMap.get(c.teacher_id)} d${c.day} s${c.slot_index}`); continue; }
      classSlot.set(cKey, c);
      teacherSlot.set(tKey, c);
      clean.push(c);
    }

    // Save draft
    const auth = req.headers.get("authorization");
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth || "" } } });
    const { data: ures } = await userClient.auth.getUser();

    const meta = {
      slot_count: slotCount,
      lesson_slots: lessonSlots,
      class_count: classes.length,
      cells_total: clean.length,
      target_total: classBriefs.reduce((acc, c) => acc + c.subjects.reduce((a, s) => a + s.periods_per_week, 0), 0),
      dropped_clashes: dropped.length,
    };

    await supabase.from("timetable_drafts").delete().eq("draft_type", "class");
    const { data: draftRow, error: dErr } = await supabase
      .from("timetable_drafts")
      .insert({ draft_type: "class", draft_json: clean, meta, created_by: ures?.user?.id || null })
      .select()
      .single();
    if (dErr) throw dErr;

    return new Response(JSON.stringify({ draft_id: draftRow.id, meta, cells: clean }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-timetable", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
