// Seed demo data for Gifford High School — admin-only.
// Deterministic, phase-verified reset that creates portal logins for every
// seeded student, parent and teacher, then cross-links the full dataset.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ACADEMIC_YEAR = "2025";
const TERM = "Term 2";
const STUDENT_PASSWORD = "Student@123";
const PARENT_PASSWORD = "Parent@123";
const TEACHER_PASSWORD = "Teacher@123";
const ADMIN_PASSWORD = "Demo@2025!";

type SeedCtx = {
  admin: any;
  callerId: string;
  log: string[];
  phase: string;
  existingAuthByEmail?: Record<string, any>;
};

const randInt = (lo: number, hi: number) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const pick = <T,>(arr: T[], idx: number): T => arr[((idx % arr.length) + arr.length) % arr.length];
const pad = (n: number, w = 4) => String(n).padStart(w, "0");
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const slug = (s: string) => s.toLowerCase().replace(/^(mr|mrs|ms|dr)\.\s+/i, "").replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
const firstLast = (name: string) => {
  const parts = slug(name).split(".").filter(Boolean);
  return { first: parts[0] || "demo", last: parts[parts.length - 1] || "user" };
};
const emailSafe = (name: string, domain: string) => `${slug(name)}@${domain}`;
const zwPhone = (seed = 1) => `0${pick(["77", "78", "71", "73"], seed)} ${200 + (seed % 700)} ${1000 + ((seed * 37) % 9000)}`;

const MALE_FIRST = ["Tendai", "Tinashe", "Tatenda", "Takudzwa", "Tadiwa", "Munyaradzi", "Tafadzwa", "Farai", "Tongai", "Kudakwashe", "Anesu", "Rutendo", "Simba", "Tichaona", "Tapiwa", "Munashe", "Brian", "Blessing", "Tanaka", "Tinotenda", "Sipho", "Nkosana", "Bongani", "Thabo", "Mthokozisi", "Lwazi"];
const SURNAMES = ["Moyo", "Ncube", "Sibanda", "Ndlovu", "Dube", "Mhlanga", "Mutasa", "Chigumba", "Marufu", "Dziva", "Chikwanda", "Mapfumo", "Mawere", "Gumbo", "Madziva", "Nyathi", "Tshuma", "Mlilo", "Banda", "Zhou", "Masuku", "Ngwenya", "Mpofu", "Bvute", "Chitando", "Mangwende", "Mukoko", "Murefu", "Gono", "Khumalo"];
const SUBURBS = ["North End, Bulawayo", "Morningside, Bulawayo", "Hillside, Bulawayo", "Famona, Bulawayo", "Barham Green, Bulawayo", "Burnside, Bulawayo", "Bradfield, Bulawayo", "Kumalo, Bulawayo", "Suburbs, Bulawayo", "Ilanda, Bulawayo"];

const SUBJECT_DEFS = [
  { code: "ENG", name: "English Language", department: "Languages", periods: 5, forms: ["Form 1", "Form 2", "Form 3", "Form 4"] },
  { code: "MAT", name: "Mathematics", department: "Mathematics", periods: 5, forms: ["Form 1", "Form 2", "Form 3", "Form 4"] },
  { code: "SHO", name: "Shona", department: "Languages", periods: 3, forms: ["Form 1", "Form 2", "Form 3", "Form 4"] },
  { code: "NDE", name: "Ndebele", department: "Languages", periods: 3, forms: ["Form 1", "Form 2", "Form 3", "Form 4"] },
  { code: "HIS", name: "History", department: "Humanities", periods: 4, forms: ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"] },
  { code: "GEO", name: "Geography", department: "Humanities", periods: 4, forms: ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"] },
  { code: "RES", name: "Religious Studies", department: "Humanities", periods: 3, forms: ["Form 1", "Form 2", "Form 3", "Form 4"] },
  { code: "CSC", name: "Combined Science", department: "Sciences", periods: 5, forms: ["Form 1", "Form 2", "Form 3", "Form 4"] },
  { code: "BIO", name: "Biology", department: "Sciences", periods: 5, forms: ["Form 4", "Form 5", "Form 6"] },
  { code: "CHE", name: "Chemistry", department: "Sciences", periods: 5, forms: ["Form 4", "Form 5", "Form 6"] },
  { code: "PHY", name: "Physics", department: "Sciences", periods: 5, forms: ["Form 4", "Form 5", "Form 6"] },
  { code: "PMA", name: "Pure Mathematics", department: "Mathematics", periods: 5, forms: ["Form 5", "Form 6"] },
  { code: "ACC", name: "Accounting", department: "Commercials", periods: 5, forms: ["Form 3", "Form 4", "Form 5", "Form 6"] },
  { code: "BST", name: "Business Studies", department: "Commercials", periods: 4, forms: ["Form 3", "Form 4", "Form 5", "Form 6"] },
  { code: "ECO", name: "Economics", department: "Commercials", periods: 5, forms: ["Form 5", "Form 6"] },
  { code: "LIT", name: "Literature in English", department: "Humanities", periods: 4, forms: ["Form 3", "Form 4", "Form 5", "Form 6"] },
  { code: "ICT", name: "Computer Science / ICT", department: "Technical", periods: 4, forms: ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"] },
  { code: "AGR", name: "Agriculture", department: "Technical", periods: 3, forms: ["Form 1", "Form 2", "Form 3", "Form 4"] },
  { code: "TGR", name: "Technical Graphics", department: "Technical", periods: 3, forms: ["Form 1", "Form 2", "Form 3", "Form 4"] },
  { code: "PED", name: "Physical Education", department: "Sports", periods: 2, forms: ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"] },
];

const STAFF_DEFS = [
  { name: "Dr. Tendai Mukoko", dept: "Administration", role: "principal", subs: ["ENG"], max: 8 },
  { name: "Mr. Blessing Sibanda", dept: "Administration", role: "deputy_principal", subs: ["MAT", "PHY"], max: 12 },
  { name: "Mrs. Rumbidzai Moyo", dept: "Languages", role: "hod", subs: ["ENG", "LIT"], max: 28 },
  { name: "Mr. Farai Ncube", dept: "Sciences", role: "hod", subs: ["BIO", "CHE"], max: 28 },
  { name: "Mr. Tafadzwa Dube", dept: "Mathematics", role: "hod", subs: ["MAT", "PMA"], max: 28 },
  { name: "Mrs. Chipo Mhlanga", dept: "Commercials", role: "hod", subs: ["ACC", "BST"], max: 26 },
  { name: "Mr. Munyaradzi Chigumba", dept: "Humanities", role: "hod", subs: ["HIS", "GEO"], max: 28 },
  { name: "Mrs. Vimbai Marufu", dept: "Languages", role: "teacher", subs: ["ENG", "SHO"], max: 30 },
  { name: "Mr. Nkosana Ndlovu", dept: "Languages", role: "teacher", subs: ["NDE", "HIS"], max: 30 },
  { name: "Ms. Tsitsi Mthembu", dept: "Languages", role: "teacher", subs: ["ENG", "LIT"], max: 30 },
  { name: "Mr. Brian Chikwanda", dept: "Mathematics", role: "teacher", subs: ["MAT", "PMA"], max: 30 },
  { name: "Mrs. Tariro Mapfumo", dept: "Mathematics", role: "teacher", subs: ["MAT"], max: 30 },
  { name: "Mr. Sipho Mlilo", dept: "Sciences", role: "teacher", subs: ["PHY", "MAT"], max: 30 },
  { name: "Mrs. Nyasha Mawere", dept: "Sciences", role: "teacher", subs: ["BIO", "CSC"], max: 30 },
  { name: "Mr. Tinashe Gumbo", dept: "Sciences", role: "teacher", subs: ["CHE", "CSC"], max: 30 },
  { name: "Mr. Bongani Mpofu", dept: "Commercials", role: "teacher", subs: ["ACC", "ECO"], max: 30 },
  { name: "Mrs. Ropafadzo Madziva", dept: "Commercials", role: "teacher", subs: ["BST", "ECO"], max: 30 },
  { name: "Mr. Thabo Banda", dept: "Humanities", role: "teacher", subs: ["GEO", "RES"], max: 30 },
  { name: "Mrs. Ruvarashe Nyathi", dept: "Humanities", role: "teacher", subs: ["HIS", "RES"], max: 30 },
  { name: "Mr. Lwazi Tshuma", dept: "Technical", role: "teacher", subs: ["ICT"], max: 30 },
  { name: "Mr. Tichaona Bvute", dept: "Technical", role: "teacher", subs: ["AGR", "TGR"], max: 30 },
  { name: "Mrs. Sibongile Masuku", dept: "Technical", role: "teacher", subs: ["TGR", "ICT"], max: 30 },
  { name: "Mr. Simba Mangwende", dept: "Sports", role: "teacher", subs: ["PED"], max: 24 },
  { name: "Mrs. Anesu Chitando", dept: "Languages", role: "teacher", subs: ["SHO", "LIT"], max: 30 },
  { name: "Mr. Kudakwashe Zhou", dept: "Sciences", role: "teacher", subs: ["BIO", "PED"], max: 30 },
  { name: "Mr. Mthokozisi Khumalo", dept: "Sciences", role: "teacher", subs: ["PHY", "CHE"], max: 30 },
  { name: "Mrs. Tariro Ngwenya", dept: "Commercials", role: "teacher", subs: ["ACC", "BST", "ECO"], max: 30 },
  { name: "Mr. Tanaka Gono", dept: "Mathematics", role: "teacher", subs: ["MAT", "ICT"], max: 30 },
];

const STREAMS = ["A", "B", "C"];
const FORM_LEVELS = ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"];
const FORM_SUBJECTS: Record<string, string[]> = {
  "Form 1": ["ENG", "MAT", "SHO", "NDE", "HIS", "GEO", "RES", "CSC", "ICT", "AGR", "TGR", "PED"],
  "Form 2": ["ENG", "MAT", "SHO", "NDE", "HIS", "GEO", "RES", "CSC", "ICT", "AGR", "TGR", "PED"],
  "Form 3": ["ENG", "MAT", "SHO", "NDE", "HIS", "GEO", "CSC", "ACC", "BST", "LIT", "ICT", "AGR", "TGR", "PED"],
  "Form 4": ["ENG", "MAT", "SHO", "NDE", "HIS", "GEO", "BIO", "CHE", "PHY", "ACC", "BST", "LIT", "ICT", "PED"],
  "Form 5": ["ENG", "PMA", "PHY", "CHE", "BIO", "ACC", "BST", "ECO", "GEO", "HIS", "LIT", "ICT", "PED"],
  "Form 6": ["ENG", "PMA", "PHY", "CHE", "BIO", "ACC", "BST", "ECO", "GEO", "HIS", "LIT", "ICT", "PED"],
};
const CLASS_DEFS = FORM_LEVELS.flatMap((form) => STREAMS.map((stream) => ({
  name: `${form}${stream}`,
  form_level: form,
  stream,
  combo: Number(form.replace("Form ", "")) >= 5 ? (stream === "A" ? "Sciences" : stream === "B" ? "Commercials" : "Humanities") : null,
  subs: FORM_SUBJECTS[form],
})));

const TT_SLOTS = [
  { start: "07:30", end: "08:10", label: "Period 1" },
  { start: "08:10", end: "08:50", label: "Period 2" },
  { start: "08:50", end: "09:30", label: "Period 3" },
  { start: "10:00", end: "10:40", label: "Period 4" },
  { start: "10:40", end: "11:20", label: "Period 5" },
  { start: "11:20", end: "12:00", label: "Period 6" },
  { start: "12:30", end: "13:10", label: "Period 7" },
  { start: "13:10", end: "13:50", label: "Period 8" },
];

const ADMIN_USERS = [
  { email: "admin@giffordhigh.demo", password: ADMIN_PASSWORD, name: "Demo Admin", role: "admin" },
  { email: "finance@giffordhigh.demo", password: ADMIN_PASSWORD, name: "Finance Office", role: "finance" },
];

const tableError = (phase: string, table: string, message: string, details?: any) => {
  const err = new Error(`${phase} / ${table}: ${message}`);
  (err as any).phase = phase;
  (err as any).table = table;
  (err as any).details = details;
  return err;
};
const assertDb = (ctx: SeedCtx, table: string, error: any) => {
  if (!error) return;
  console.error(`[seed-demo-data] ${ctx.phase} failed on ${table}:`, error);
  throw tableError(ctx.phase, table, error.message || String(error), error);
};
const push = (ctx: SeedCtx, s: string) => { ctx.log.push(s); console.log(s); };
const runPhase = async <T,>(ctx: SeedCtx, phase: string, fn: () => Promise<T>): Promise<T> => {
  ctx.phase = phase;
  push(ctx, `${phase}…`);
  try {
    const result = await fn();
    push(ctx, `✅ ${phase} complete`);
    return result;
  } catch (error: any) {
    console.error(`[seed-demo-data] ${phase} failed`, error);
    throw error?.phase ? error : tableError(phase, "phase", error?.message || String(error), error);
  }
};
const insertRows = async (ctx: SeedCtx, table: string, rows: any, select = false) => {
  if (Array.isArray(rows) && rows.length === 0) return select ? [] : null;
  const query = ctx.admin.from(table).insert(rows);
  const { data, error } = select ? await query.select() : await query;
  assertDb(ctx, table, error);
  return data;
};
const upsertRows = async (ctx: SeedCtx, table: string, rows: any, onConflict: string, select = false) => {
  if (Array.isArray(rows) && rows.length === 0) return select ? [] : null;
  const query = ctx.admin.from(table).upsert(rows, { onConflict });
  const { data, error } = select ? await query.select() : await query;
  assertDb(ctx, table, error);
  return data;
};
const listAllAuthUsers = async (admin: any) => {
  const users: any[] = [];
  const perPage = 1000;
  for (let page = 1; page <= 30; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw tableError("Auth cleanup", "auth.users", error.message || String(error), error);
    users.push(...(data?.users || []));
    if (!data?.users || data.users.length < perPage) break;
  }
  return users;
};
type AuthSpec = { email: string; password: string; name: string; role: string; ref?: string };

const mapLimit = async <T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>) => {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
};

const createOrUpdateAuthUser = async (ctx: SeedCtx, spec: AuthSpec) => {
  const email = spec.email.toLowerCase();
  const existing = ctx.existingAuthByEmail?.[email];
  if (existing?.id) {
    const { data, error } = await ctx.admin.auth.admin.updateUserById(existing.id, {
      password: spec.password,
      email_confirm: true,
      user_metadata: { full_name: spec.name },
    });
    if (error) throw tableError(ctx.phase, "auth.users", `${spec.email}: ${error.message}`, error);
    return data?.user?.id || existing.id;
  }

  const { data, error } = await ctx.admin.auth.admin.createUser({
    email: spec.email,
    password: spec.password,
    email_confirm: true,
    user_metadata: { full_name: spec.name },
  });
  if (error) throw tableError(ctx.phase, "auth.users", `${spec.email}: ${error.message}`, error);
  const userId = data.user!.id;
  ctx.existingAuthByEmail ||= {};
  ctx.existingAuthByEmail[email] = data.user;
  return userId;
};

const ensureAuthUsers = async (ctx: SeedCtx, specs: AuthSpec[], concurrency = 20) => {
  const created = await mapLimit(specs, concurrency, async (spec) => ({
    ...spec,
    userId: await createOrUpdateAuthUser(ctx, spec),
  }));
  await upsertRows(ctx, "profiles", created.map((u) => ({ id: u.userId, full_name: u.name, email: u.email })), "id");
  await upsertRows(ctx, "user_roles", created.map((u) => ({ user_id: u.userId, role: u.role })), "user_id,role");
  return created;
};

const studentName = (n: number) => `${pick(MALE_FIRST, n)} ${pick(SURNAMES, Math.floor(n / 2) + n)}`;
const studentEmail = (admission: string) => `ghs${admission.replace(/\D/g, "")}@giffordhigh.ac.zw`;
const parentEmail = (guardianName: string, familyIndex: number) => {
  const { first, last } = firstLast(guardianName);
  return `${first}.${last}${familyIndex}@gmail.com`;
};
const SPECIAL_PARENT_OVERRIDES: Record<number, { name: string; email: string; status: string; plan: string }> = {
  0: { name: "Mr. Tendai Dube", email: "tendai.dube1@gmail.com", status: "active", plan: "termly" },
  109: { name: "Mrs. Tinashe Gono", email: "tinashe.gono110@gmail.com", status: "expired", plan: "termly" },
  324: { name: "Mr. Simba Gumbo", email: "simba.gumbo325@gmail.com", status: "free_trial", plan: "monthly" },
};

const buildTimetable = (classDefs: any[], classByName: Record<string, any>, subjByCode: Record<string, any>, classSubjectByKey: Record<string, any>, staffById: Record<string, any>, venueByName: Record<string, any>) => {
  const ttRows: any[] = [];
  const simpleRows: any[] = [];
  const teacherBusy = new Set<string>();
  const teacherLoad: Record<string, number> = {};
  const allocationsBySubject: Record<string, any[]> = {};
  Object.values(classSubjectByKey).forEach((cs: any) => {
    const subjectCode = Object.keys(subjByCode).find((code) => subjByCode[code].id === cs.subject_id);
    if (!subjectCode || !cs.teacher_id) return;
    allocationsBySubject[subjectCode] ||= [];
    allocationsBySubject[subjectCode].push(cs);
  });

  const pickTeacher = (subjectCode: string, day: number, period: number) => {
    const options = (allocationsBySubject[subjectCode] || []).map((cs: any) => staffById[cs.teacher_id]).filter(Boolean);
    const free = options.filter((s: any) => !teacherBusy.has(`${s.id}-${day}-${period}`));
    const pool = free.length ? free : options;
    pool.sort((a: any, b: any) => (teacherLoad[a.id] || 0) - (teacherLoad[b.id] || 0));
    return pool[0];
  };

  for (const cd of classDefs) {
    const cls = classByName[cd.name];
    const weighted = cd.subs.flatMap((code: string) => Array(Math.min(SUBJECT_DEFS.find((s) => s.code === code)?.periods || 3, 5)).fill(code));
    let cursor = 0;
    for (let day = 1; day <= 5; day++) {
      const usedToday = new Set<string>();
      for (let p = 0; p < TT_SLOTS.length; p++) {
        let code = weighted[(cursor + day + p) % weighted.length];
        for (let guard = 0; guard < weighted.length && usedToday.has(code); guard++) {
          code = weighted[(cursor + day + p + guard) % weighted.length];
        }
        usedToday.add(code);
        cursor++;
        const subj = subjByCode[code];
        const teacher = pickTeacher(code, day, p + 1);
        if (!teacher) throw new Error(`No teacher available for ${code}`);
        teacherBusy.add(`${teacher.id}-${day}-${p + 1}`);
        teacherLoad[teacher.id] = (teacherLoad[teacher.id] || 0) + 1;
        const venue = venueByName[cls.room] || venueByName[`Room ${((p + day) % 18) + 1}`] || Object.values(venueByName)[0];
        ttRows.push({
          class_id: cls.id,
          subject_id: subj.id,
          teacher_id: teacher.id,
          day_of_week: day,
          start_time: TT_SLOTS[p].start,
          end_time: TT_SLOTS[p].end,
          room: venue?.name || cls.room,
          venue_id: venue?.id || null,
          academic_year: ACADEMIC_YEAR,
          term: TERM,
        });
        simpleRows.push({ class_id: cls.id, subject_id: subj.id, day_of_week: day, time_slot: TT_SLOTS[p].label });
      }
    }
  }
  return { ttRows, simpleRows };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(url, service);
    const callerId = userData.user.id;
    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", callerId);
    const callerRoles = (roleRows || []).map((r: any) => r.role);
    if (!callerRoles.includes("admin")) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ctx: SeedCtx = { admin, callerId, log: [], phase: "Start" };
    const adminIds: Record<string, string> = {};
    const teacherUserIds: Record<string, string> = {};
    const studentUserIds: Record<string, string> = {};
    const parentUserIds: Record<string, string> = {};

    await runPhase(ctx, "PHASE 1: Truncate all seeded tables", async () => {
      const { error } = await admin.rpc("wipe_demo_data");
      assertDb(ctx, "wipe_demo_data", error);
      const existing = await listAllAuthUsers(admin);
      const seedAuthEmails = new Set<string>([
        ...ADMIN_USERS.map((u) => u.email),
        ...STAFF_DEFS.map((s) => emailSafe(s.name, "giffordhigh.co.zw")),
      ]);
      for (let counter = 1; counter <= 650; counter++) {
        const admission = `GHS-2025-${pad(counter, 4)}`;
        seedAuthEmails.add(studentEmail(admission));
      }
      for (let i = 0; i < 325; i++) {
        if (SPECIAL_PARENT_OVERRIDES[i]) {
          seedAuthEmails.add(SPECIAL_PARENT_OVERRIDES[i].email);
          continue;
        }
        const counter = i * 2 + 1;
        const childName = counter === 1 ? "Takudzwa Dube" : counter === 220 ? "Anesu Sibanda" : counter === 650 ? "Tadiwanashe Mutasa" : studentName(counter);
        const surname = childName.split(" ").slice(-1)[0];
        const parentName = `${i % 3 === 0 ? "Mr." : "Mrs."} ${pick(MALE_FIRST, i)} ${surname}`;
        seedAuthEmails.add(parentEmail(parentName, i + 1));
      }
      ctx.existingAuthByEmail = {};
      for (const u of existing) {
        const email = (u.email || "").toLowerCase();
        if (email && seedAuthEmails.has(email)) ctx.existingAuthByEmail[email] = u;
      }
      const reusableSeedUserIds = Object.values(ctx.existingAuthByEmail).map((u: any) => u.id).filter(Boolean);
      for (let i = 0; i < reusableSeedUserIds.length; i += 500) {
        const { error } = await admin.from("user_roles").delete().in("user_id", reusableSeedUserIds.slice(i, i + 500));
        assertDb(ctx, "user_roles", error);
      }
      push(ctx, `  found ${reusableSeedUserIds.length} existing seed login accounts to reuse`);
    });

    await runPhase(ctx, "PHASE 2: Insert subjects", async () => {
      const subjects = await insertRows(ctx, "subjects", SUBJECT_DEFS.map((s) => ({
        name: s.name,
        code: s.code,
        department: s.department,
        form_levels: s.forms,
        is_examinable: true,
      })), true);
      push(ctx, `  inserted ${subjects.length} subjects`);
    });

    const { data: subjectsIns, error: subjectsReadError } = await admin.from("subjects").select("*");
    assertDb(ctx, "subjects", subjectsReadError);
    const subjByCode: Record<string, any> = {};
    for (const subject of subjectsIns || []) {
      const def = SUBJECT_DEFS.find((s) => s.name === subject.name || s.code === subject.code);
      if (def) subjByCode[def.code] = subject;
    }

    await runPhase(ctx, "PHASE 3: Insert teachers and teacher auth accounts", async () => {
      const adminAccounts = await ensureAuthUsers(ctx, ADMIN_USERS.map((au) => ({ ...au, ref: au.email })), 8);
      for (const au of adminAccounts) adminIds[au.email] = au.userId;
      const teacherAccounts = await ensureAuthUsers(ctx, STAFF_DEFS.map((teacher) => ({
        ref: teacher.name,
        email: emailSafe(teacher.name, "giffordhigh.co.zw"),
        password: TEACHER_PASSWORD,
        name: teacher.name,
        role: teacher.role === "hod" ? "hod" : teacher.role === "principal" ? "principal" : teacher.role === "deputy_principal" ? "deputy_principal" : "teacher",
      })), 12);
      for (const teacher of teacherAccounts) teacherUserIds[teacher.ref!] = teacher.userId;
      const rows = STAFF_DEFS.map((sd, i) => ({
        user_id: teacherUserIds[sd.name],
        full_name: sd.name,
        title: sd.role === "principal" ? "Headmaster" : sd.role === "deputy_principal" ? "Deputy Head" : sd.role === "hod" ? "Head of Department" : "Teacher",
        department: sd.dept,
        category: "academic",
        role: sd.role,
        staff_number: `GHS-T-${pad(i + 1, 3)}`,
        email: emailSafe(sd.name, "giffordhigh.co.zw"),
        phone: zwPhone(i + 1),
        subjects_taught: sd.subs,
        max_periods_per_week: sd.max,
        address: pick(SUBURBS, i),
        emergency_contact: zwPhone(i + 30),
        employment_date: `202${i % 5}-0${(i % 9) + 1}-1${i % 9}`,
        qualifications: pick(["BEd (UZ)", "BSc Hons (NUST)", "MEd (MSU)", "BA Hons (UZ)", "Dip Ed (Hillside)"], i),
        status: "active",
      }));
      const staff = await insertRows(ctx, "staff", rows, true);
      push(ctx, `  inserted ${staff.length} staff / ${Object.keys(teacherUserIds).length} teacher accounts`);
    });

    const { data: staffIns, error: staffReadError } = await admin.from("staff").select("*");
    assertDb(ctx, "staff", staffReadError);
    const staffByName: Record<string, any> = {};
    const staffById: Record<string, any> = {};
    for (const s of staffIns || []) { staffByName[s.full_name] = s; staffById[s.id] = s; }

    let venuesIns: any[] = [];
    await runPhase(ctx, "PHASE 4: Insert classes", async () => {
      venuesIns = await insertRows(ctx, "teaching_venues", [
        ...Array.from({ length: 18 }, (_, i) => ({ name: `Room ${i + 1}`, venue_type: "classroom", capacity: 40, is_active: true })),
        { name: "Science Lab 1", venue_type: "lab", capacity: 35, is_active: true },
        { name: "Science Lab 2", venue_type: "lab", capacity: 35, is_active: true },
        { name: "Computer Lab", venue_type: "lab", capacity: 35, is_active: true },
        { name: "Library", venue_type: "other", capacity: 60, is_active: true },
        { name: "School Hall", venue_type: "hall", capacity: 650, is_active: true },
      ], true);
      const formTeachers = STAFF_DEFS.filter((s) => s.role === "teacher" || s.role === "hod");
      const rows = CLASS_DEFS.map((c, i) => ({
        name: c.name,
        form_level: c.form_level,
        stream: c.stream,
        class_teacher_id: staffByName[pick(formTeachers, i).name].id,
        room: `Room ${i + 1}`,
        capacity: i < 2 ? 37 : 36,
      }));
      const classes = await insertRows(ctx, "classes", rows, true);
      if (classes.length !== 18) throw tableError(ctx.phase, "classes", `Expected 18 classes, created ${classes.length}`);
      push(ctx, `  inserted ${classes.length} classes`);
    });

    const { data: classesIns, error: classesReadError } = await admin.from("classes").select("*");
    assertDb(ctx, "classes", classesReadError);
    const classByName: Record<string, any> = {};
    for (const c of classesIns || []) classByName[c.name] = c;
    const venueByName: Record<string, any> = {};
    for (const v of venuesIns || []) venueByName[v.name] = v;

    let classSubjectsIns: any[] = [];
    const classSubjectByKey: Record<string, any> = {};
    await runPhase(ctx, "PHASE 5: Insert class subjects", async () => {
      const rows: any[] = [];
      const teacherRoundRobin: Record<string, number> = {};
      for (const cd of CLASS_DEFS) {
        const cls = classByName[cd.name];
        for (const code of cd.subs) {
          const eligible = STAFF_DEFS.filter((sd) => sd.subs.includes(code));
          teacherRoundRobin[code] = (teacherRoundRobin[code] || 0) + 1;
          const teacherDef = pick(eligible, teacherRoundRobin[code]);
          rows.push({
            class_id: cls.id,
            subject_id: subjByCode[code].id,
            teacher_id: staffByName[teacherDef.name].id,
            periods_per_week: SUBJECT_DEFS.find((s) => s.code === code)?.periods || 4,
          });
        }
      }
      classSubjectsIns = await insertRows(ctx, "class_subjects", rows, true);
      for (const cs of classSubjectsIns) classSubjectByKey[`${cs.class_id}-${cs.subject_id}`] = cs;
      push(ctx, `  inserted ${classSubjectsIns.length} class subject allocations`);
    });

    const studentsByClass: Record<string, any[]> = {};
    let studentsIns: any[] = [];
    await runPhase(ctx, "PHASE 6: Insert students and student auth accounts", async () => {
      const rows: any[] = [];
      let counter = 1;
      const classTargets = CLASS_DEFS.map((cd, i) => ({ cd, count: i < 2 ? 37 : 36 }));
      for (const { cd, count } of classTargets) {
        const formNum = Number(cd.form_level.replace("Form ", ""));
        for (let i = 0; i < count; i++) {
          const admission = `GHS-2025-${pad(counter, 4)}`;
          const name = counter === 1 ? "Takudzwa Dube" : counter === 220 ? "Anesu Sibanda" : counter === 650 ? "Tadiwanashe Mutasa" : studentName(counter);
          const email = studentEmail(admission);
          const userId = await ensureAuthUser(ctx, email, STUDENT_PASSWORD, name, "student");
          studentUserIds[email] = userId;
          rows.push({
            admission_number: admission,
            full_name: name,
            class_id: classByName[cd.name].id,
            date_of_birth: `${2025 - (12 + formNum)}-${pad((counter % 12) + 1, 2)}-${pad((counter % 27) + 1, 2)}`,
            form: cd.form_level,
            stream: cd.stream,
            subject_combination: cd.combo,
            gender: "Male",
            guardian_name: `Parent ${pick(SURNAMES, Math.ceil(counter / 2))}`,
            guardian_phone: zwPhone(counter),
            guardian_email: `parent.${pad(Math.ceil(counter / 2), 3)}@gmail.com`,
            emergency_contact: zwPhone(counter + 99),
            address: pick(SUBURBS, counter),
            enrollment_date: `2025-01-${pad((counter % 20) + 8, 2)}`,
            status: "active",
            boarding_status: counter % 5 === 0 ? "boarding" : "day",
            email,
            user_id: userId,
          });
          counter++;
        }
      }
      studentsIns = await insertRows(ctx, "students", rows, true);
      const scRows = studentsIns.map((s: any) => {
        const cd = CLASS_DEFS.find((c) => c.form_level === s.form && c.stream === s.stream)!;
        return { student_id: s.id, class_id: classByName[cd.name].id };
      });
      const enrollmentRows = studentsIns.map((s: any) => {
        const cd = CLASS_DEFS.find((c) => c.form_level === s.form && c.stream === s.stream)!;
        return { student_id: s.id, class_id: classByName[cd.name].id, academic_year: ACADEMIC_YEAR, enrollment_date: s.enrollment_date };
      });
      await insertRows(ctx, "student_classes", scRows);
      await insertRows(ctx, "enrollments", enrollmentRows);
      for (const c of CLASS_DEFS) studentsByClass[c.name] = [];
      for (const s of studentsIns) {
        const cd = CLASS_DEFS.find((c) => c.form_level === s.form && c.stream === s.stream)!;
        studentsByClass[cd.name].push(s);
      }
      push(ctx, `  inserted ${studentsIns.length} students, ${scRows.length} class links, ${Object.keys(studentUserIds).length} student accounts`);
    });

    let parentLinksCount = 0;
    let parentsCreated = 0;
    await runPhase(ctx, "PHASE 7: Insert parents and link children", async () => {
      const familyStudents: any[][] = [];
      for (let i = 0; i < studentsIns.length; i += 2) familyStudents.push(studentsIns.slice(i, i + 2));
      const linkRows: any[] = [];
      const guardianRows: any[] = [];
      const subscriptionRows: any[] = [];
      for (let i = 0; i < familyStudents.length; i++) {
        const family = familyStudents[i];
        const surname = family[0].full_name.split(" ").slice(-1)[0];
        const override = SPECIAL_PARENT_OVERRIDES[i];
        const parentName = override?.name || `${i % 3 === 0 ? "Mr." : "Mrs."} ${pick(MALE_FIRST, i)} ${surname}`;
        const email = override?.email || parentEmail(parentName, i + 1);
        const parentId = await ensureAuthUser(ctx, email, PARENT_PASSWORD, parentName, "parent");
        parentUserIds[email] = parentId;
        parentsCreated++;
        for (const child of family) {
          linkRows.push({ parent_id: parentId, student_id: child.id });
          guardianRows.push({ student_id: child.id, name: parentName, relationship: i % 3 === 0 ? "Father" : "Mother", phone: zwPhone(i), email, is_primary: true });
          subscriptionRows.push({
            parent_id: parentId,
            student_id: child.id,
            status: override?.status || "active",
            trial_end_date: override?.status === "expired" ? "2025-04-30" : "2025-12-31",
            payment_due_date: override?.status === "expired" ? "2025-05-01" : "2025-12-31",
            plan_type: override?.plan || "termly",
            amount_usd: 25,
          });
        }
      }
      await insertRows(ctx, "parent_students", linkRows);
      await insertRows(ctx, "guardians", guardianRows);
      await insertRows(ctx, "portal_subscriptions", subscriptionRows);
      parentLinksCount = linkRows.length;
      push(ctx, `  inserted ${parentsCreated} parent accounts and ${parentLinksCount} child links`);
    });

    await runPhase(ctx, "PHASE 8: Verify teacher allocations", async () => {
      const missing = classSubjectsIns.filter((cs: any) => !cs.teacher_id);
      if (missing.length) throw tableError(ctx.phase, "class_subjects", `${missing.length} allocations missing teacher_id`, missing.slice(0, 10));
      push(ctx, `  verified ${classSubjectsIns.length} class-subject teacher allocations`);
    });

    let ttRows: any[] = [];
    await runPhase(ctx, "PHASE 9: Insert timetable slots", async () => {
      await upsertRows(ctx, "timetable_time_slots", TT_SLOTS.map((s, i) => ({ ...s, slot_type: "lesson", display_order: i + 1 })), "start_time,end_time");
      const built = buildTimetable(CLASS_DEFS, classByName, subjByCode, classSubjectByKey, staffById, venueByName);
      ttRows = built.ttRows;
      await insertRows(ctx, "timetable_entries", ttRows);
      await insertRows(ctx, "timetable", built.simpleRows);
      push(ctx, `  inserted ${ttRows.length} timetable entries`);
    });

    let marksRows: any[] = [];
    let attRows: any[] = [];
    await runPhase(ctx, "PHASE 10: Seed academics, attendance, finance and communications", async () => {
      const feeRows: any[] = [];
      for (const term of ["Term 1", "Term 2", "Term 3"]) {
        for (const form of FORM_LEVELS) {
          const high = ["Form 5", "Form 6"].includes(form);
          feeRows.push({ academic_year: ACADEMIC_YEAR, term, form, boarding_status: "day", description: `${form} Tuition (${term})`, amount_usd: high ? 220 : 180, amount_zig: high ? 5940 : 4860, is_active: true });
          feeRows.push({ academic_year: ACADEMIC_YEAR, term, form, boarding_status: "day", description: `${form} Levy (${term})`, amount_usd: 30, amount_zig: 810, is_active: true });
        }
      }
      await insertRows(ctx, "fee_structures", feeRows);

      for (const cd of CLASS_DEFS) {
        const students = studentsByClass[cd.name] || [];
        for (let i = 0; i < students.length; i++) {
          const student = students[i];
          const tier = student.full_name === "Tadiwanashe Mutasa" || i === students.length - 1 ? "top" : student.full_name === "Takudzwa Dube" || i < 2 ? "low" : "avg";
          for (const code of cd.subs.slice(0, 8)) {
            const subj = subjByCode[code];
            const cs = classSubjectByKey[`${classByName[cd.name].id}-${subj.id}`];
            const teacherUserId = staffById[cs.teacher_id]?.user_id || ctx.callerId;
            const base = tier === "top" ? 84 : tier === "low" ? 38 : 63;
            for (const [term, type, drift] of [["Term 1", "test", 0], ["Term 1", "exam", 3], [TERM, "test", tier === "low" ? -4 : 1]] as any[]) {
              marksRows.push({ student_id: student.id, subject_id: subj.id, teacher_id: teacherUserId, mark: Math.max(18, Math.min(98, base + randInt(-6, 6) + drift)), assessment_type: type, term, description: type === "exam" ? "End of Term Exam" : "Class Test", comment: tier === "top" ? "Excellent work" : tier === "low" ? "Needs focused support" : "Good progress" });
            }
          }
        }
      }
      for (let i = 0; i < marksRows.length; i += 500) await insertRows(ctx, "marks", marksRows.slice(i, i + 500));

      const today = new Date();
      const schoolDays: Date[] = [];
      const cursor = new Date(today); cursor.setDate(cursor.getDate() - 1);
      while (schoolDays.length < 10) {
        if (cursor.getDay() >= 1 && cursor.getDay() <= 5) schoolDays.push(new Date(cursor));
        cursor.setDate(cursor.getDate() - 1);
      }
      for (const cd of CLASS_DEFS) {
        const cls = classByName[cd.name];
        for (const [idx, student] of (studentsByClass[cd.name] || []).entries()) {
          for (const [dayIdx, day] of schoolDays.entries()) {
            const low = idx < 2 || student.full_name === "Takudzwa Dube";
            attRows.push({ student_id: student.id, class_id: cls.id, attendance_date: isoDate(day), status: low && dayIdx < 4 ? pick(["absent", "late", "present"], idx + dayIdx) : "present", recorded_by: ctx.callerId });
          }
        }
      }
      for (let i = 0; i < attRows.length; i += 1000) await insertRows(ctx, "attendance", attRows.slice(i, i + 1000));

      const invoiceRows = studentsIns.map((s, i) => ({ invoice_number: `INV-25-T2-${pad(i + 1, 5)}`, student_id: s.id, academic_year: ACADEMIC_YEAR, term: TERM, total_usd: ["Form 5", "Form 6"].includes(s.form) ? 250 : 210, total_zig: ["Form 5", "Form 6"].includes(s.form) ? 6750 : 5670, paid_usd: 0, paid_zig: 0, status: "unpaid", due_date: "2025-07-31", notes: "Seed demo invoice" }));
      const invoices = await insertRows(ctx, "invoices", invoiceRows, true);
      const payRows = invoices.map((inv: any, i: number) => i % 7 === 0 ? null : ({ receipt_number: `RCT-${pad(i + 1, 6)}`, invoice_id: inv.id, student_id: inv.student_id, amount_usd: i % 5 === 0 ? Math.round(Number(inv.total_usd) / 2) : inv.total_usd, amount_zig: 0, payment_method: pick(["cash", "ecocash", "paynow", "bank_transfer", "swipe"], i), reference_number: `TX${100000 + i}`, payment_date: isoDate(new Date(Date.now() - (i % 30) * 86400000)), recorded_by: ctx.callerId, notes: "Seed demo payment" })).filter(Boolean);
      for (let i = 0; i < payRows.length; i += 500) await insertRows(ctx, "payments", payRows.slice(i, i + 500));

      const examStart = new Date(); examStart.setDate(examStart.getDate() + 14);
      for (const form of FORM_LEVELS) {
        const subjectIds = FORM_SUBJECTS[form].slice(0, 8).map((code) => subjByCode[code].id);
        const { data: exam, error } = await admin.from("exams").insert({ name: `${form} End of Term 2 Exam`, exam_type: "end_of_term", form_level: form, term: TERM, academic_year: ACADEMIC_YEAR, start_date: isoDate(examStart), end_date: isoDate(new Date(examStart.getTime() + 10 * 86400000)), subject_ids: subjectIds, is_published: true }).select().single();
        assertDb(ctx, "exams", error);
        const examRows = subjectIds.map((sid: string, idx: number) => ({ exam_id: exam.id, subject_id: sid, exam_date: isoDate(new Date(examStart.getTime() + Math.floor(idx / 2) * 86400000)), start_time: idx % 2 === 0 ? "08:00" : "13:00", end_time: idx % 2 === 0 ? "10:30" : "15:30", venue: idx % 2 === 0 ? "School Hall" : "Library" }));
        await insertRows(ctx, "exam_timetable_entries", examRows);
      }

      const lessonRows = classSubjectsIns.slice(0, 60).map((cs: any, i: number) => ({ teacher_id: staffById[cs.teacher_id].user_id, subject_id: cs.subject_id, class_id: cs.class_id, title: `Week ${1 + (i % 6)} Lesson Plan`, date: isoDate(new Date(Date.now() + (i % 14) * 86400000)), duration_minutes: 40, objectives: "Students will understand, practise and demonstrate the target concept.", materials_needed: "Textbook, whiteboard, worksheets", introduction: "Recap prior knowledge and introduce lesson context.", main_activity: "Guided practice, group work and independent examples.", conclusion: "Summarise key ideas and check understanding.", assessment_strategy: "Questioning, exercise marking and exit ticket.", homework_notes: "Complete assigned textbook exercises.", status: "published" }));
      await insertRows(ctx, "lesson_plans", lessonRows);
      await insertRows(ctx, "announcements", [
        { title: "Term 2 Fees — Final Reminder", content: "All Term 2 fees are due by end of week.", is_public: true, target_type: "whole_school" },
        { title: "Mid-Term Exams Schedule Released", content: "End-of-term exam timetable is now available on your dashboard.", is_public: true, target_type: "whole_school" },
        { title: "Parent–Teacher Conference", content: "Scheduled for next Saturday in the school hall.", is_public: true, target_type: "whole_school" },
      ]);
      await insertRows(ctx, "events", [
        { title: "Inter-House Athletics", description: "Annual athletics meet", event_date: isoDate(new Date(Date.now() + 3 * 86400000)), event_type: "sports" },
        { title: "Parent–Teacher Conference", description: "School Hall", event_date: isoDate(new Date(Date.now() + 7 * 86400000)), event_type: "meeting" },
        { title: "Term 2 End-of-Term Exams Begin", description: "All forms", event_date: isoDate(examStart), event_type: "exam" },
      ]);
      await insertRows(ctx, "audit_logs", Array.from({ length: 18 }, (_, i) => ({ user_id: adminIds["admin@giffordhigh.demo"] || ctx.callerId, action: pick(["ai_report_comment_generated", "ai_lesson_plan_generated", "ai_timetable_generated", "ai_submission_marked"], i), table_name: "ai_logs", new_data: { model: "google/gemini-2.5-flash", tokens_in: 400 + i * 33, tokens_out: 180 + i * 21, accepted: i % 4 !== 0, at: new Date().toISOString() } })));
      push(ctx, `  inserted ${marksRows.length} marks, ${attRows.length} attendance rows, ${invoices.length} invoices`);
    });

    const verification = await runPhase(ctx, "PHASE 11: Run verification checks", async () => {
      const q = async (name: string, query: any) => {
        const { count, error } = await query;
        assertDb(ctx, name, error);
        return count || 0;
      };
      const students = await q("students", admin.from("students").select("id", { count: "exact", head: true }));
      const studentClassLinks = await q("student_classes", admin.from("student_classes").select("student_id", { count: "exact", head: true }));
      const studentAccounts = await q("students.user_id", admin.from("students").select("id", { count: "exact", head: true }).not("user_id", "is", null));
      const parentLinks = await q("parent_students", admin.from("parent_students").select("student_id", { count: "exact", head: true }));
      const linkedStudents = new Set((await admin.from("parent_students").select("student_id")).data?.map((r: any) => r.student_id) || []).size;
      const teacherCount = await q("staff", admin.from("staff").select("id", { count: "exact", head: true }).eq("category", "academic"));
      const teacherAccounts = await q("staff.user_id", admin.from("staff").select("id", { count: "exact", head: true }).eq("category", "academic").not("user_id", "is", null));
      const classes = await q("classes", admin.from("classes").select("id", { count: "exact", head: true }));
      const classesWithTeachers = await q("classes.class_teacher_id", admin.from("classes").select("id", { count: "exact", head: true }).not("class_teacher_id", "is", null));
      const timetableEntries = await q("timetable_entries", admin.from("timetable_entries").select("id", { count: "exact", head: true }));
      const { data: conflictRows, error: conflictError } = await admin.from("timetable_entries").select("teacher_id,day_of_week,start_time");
      assertDb(ctx, "timetable_entries", conflictError);
      const seen = new Set<string>();
      const conflicts: string[] = [];
      for (const row of conflictRows || []) {
        const key = `${row.teacher_id}-${row.day_of_week}-${row.start_time}`;
        if (seen.has(key)) conflicts.push(key);
        seen.add(key);
      }
      const orphanTimetable = (conflictRows || []).filter((r: any) => !r.teacher_id).length;
      const checks = [
        { ok: students === 650 && studentClassLinks === students, line: `${studentClassLinks}/${students} students linked to classes`, details: [] },
        { ok: students === 650 && studentAccounts === students, line: `${studentAccounts}/${students} students have portal accounts`, details: [] },
        { ok: linkedStudents === students, line: `${linkedStudents}/${students} students have at least 1 linked parent`, details: [] },
        { ok: parentLinks === students, line: `${parentLinks}/${parentLinksCount} parent links created`, details: [] },
        { ok: teacherCount === STAFF_DEFS.length && teacherAccounts === teacherCount, line: `${teacherAccounts}/${teacherCount} teachers have portal accounts`, details: [] },
        { ok: classes === 18 && classesWithTeachers === 18, line: `${classesWithTeachers}/${classes} classes created with class teachers`, details: [] },
        { ok: timetableEntries === 720 && conflicts.length === 0 && orphanTimetable === 0, line: `${timetableEntries}/720 timetable slots created, ${conflicts.length} conflicts`, details: conflicts.slice(0, 20) },
      ];
      const failures = checks.filter((c) => !c.ok);
      for (const check of checks) push(ctx, `${check.ok ? "✅" : "❌"} ${check.line}`);
      if (failures.length) throw tableError(ctx.phase, "verification", failures.map((f) => f.line).join("; "), failures);
      return { checks, students, studentClassLinks, studentAccounts, linkedStudents, parentAccounts: parentsCreated, parentLinks, teachers: teacherCount, teacherAccounts, classes, timetableEntries, conflicts: conflicts.length };
    });

    push(ctx, "✅ Seed complete.");
    return new Response(JSON.stringify({
      ok: true,
      summary: {
        students: verification.students,
        student_accounts: verification.studentAccounts,
        parent_accounts: verification.parentAccounts,
        parent_links: verification.parentLinks,
        staff: verification.teachers,
        teacher_accounts: verification.teacherAccounts,
        classes: verification.classes,
        subjects: Object.keys(subjByCode).length,
        timetable_entries: verification.timetableEntries,
        marks: marksRows.length,
        attendance: attRows.length,
        conflicts: verification.conflicts,
      },
      verification: verification.checks.map((c: any) => ({ ok: c.ok, line: c.line, details: c.details })),
      log: ctx.log,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("[seed-demo-data] fatal", e);
    return new Response(JSON.stringify({
      error: e?.message || String(e),
      phase: e?.phase,
      table: e?.table,
      details: e?.details,
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});