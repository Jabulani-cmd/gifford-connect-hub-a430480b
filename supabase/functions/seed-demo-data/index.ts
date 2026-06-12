// Seed demo data for Gifford High School — admin-only.
// Wipes academic/finance tables, creates ~12 demo auth users, then seeds
// 6 classes (Form 1A..6A), 180 students, ~25 staff, fees, timetable,
// marks, attendance, exams, lesson plans, announcements, events,
// term reports and AI usage logs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ===================== Helpers =====================
const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (lo: number, hi: number) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const pick = <T,>(arr: T[], n: number): T[] => {
  const c = [...arr]; const out: T[] = [];
  for (let i = 0; i < n && c.length; i++) out.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]);
  return out;
};
const pad = (n: number, w = 4) => String(n).padStart(w, "0");
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const SHONA_FIRST_M = ["Tendai","Tinashe","Tatenda","Takudzwa","Tadiwa","Munyaradzi","Tafadzwa","Farai","Tongai","Kudakwashe","Anesu","Rutendo","Simba","Tichaona","Tapiwa","Munashe","Brian","Blessing","Tanaka","Tinotenda"];
const SHONA_FIRST_F = ["Rumbidzai","Chipo","Tariro","Nyasha","Rutendo","Tendai","Vimbai","Anesu","Tsitsi","Ropafadzo","Tadiwa","Mufaro","Panashe","Chiedza","Ruvarashe","Tanatswa"];
const NDEBELE_FIRST = ["Sipho","Nkosana","Bongani","Thabo","Mthokozisi","Lwazi","Nomvula","Sibusisiwe","Nokuthula","Thandeka","Sibongile","Nomathemba"];
const SURNAMES = ["Moyo","Ncube","Sibanda","Ndlovu","Dube","Mhlanga","Mthembu","Mutasa","Chigumba","Marufu","Dziva","Chikwanda","Mapfumo","Mawere","Chinhamo","Gumbo","Madziva","Nyathi","Tshuma","Mlilo","Banda","Kativhu","Murefu","Zhou","Gono","Mukoko","Chipinge","Masuku","Ngwenya","Mpofu","Bvute","Chitando","Mangwende"];
const SUBURBS = ["Mbare, Harare","Highfield, Harare","Borrowdale, Harare","Avondale, Harare","Mount Pleasant, Harare","Chitungwiza","Waterfalls, Harare","Glen View, Harare","Hatfield, Harare","Greendale, Harare","Marlborough, Harare","Belvedere, Harare","Warren Park, Harare","Kuwadzana, Harare"];

const fullName = (gender: "M" | "F") => {
  const first = gender === "M"
    ? rand([...SHONA_FIRST_M, ...NDEBELE_FIRST.slice(0, 6)])
    : rand([...SHONA_FIRST_F, ...NDEBELE_FIRST.slice(6)]);
  return `${first} ${rand(SURNAMES)}`;
};
const zwPhone = () => `0${rand(["77","78","71","73"])} ${randInt(200,999)} ${randInt(1000,9999)}`;

const tableError = (table: string, message: string) => {
  const err = new Error(`${table}: ${message}`);
  (err as any).table = table;
  return err;
};

const assertDb = (table: string, error: any) => {
  if (!error) return;
  console.error(`[seed-demo-data] ${table} failed:`, error);
  throw tableError(table, error.message || String(error));
};

const listAllAuthUsers = async (admin: any) => {
  const users: any[] = [];
  const perPage = 1000;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw tableError("auth.users", error.message || String(error));
    users.push(...(data?.users || []));
    if (!data?.users || data.users.length < perPage) break;
  }
  return users;
};

const insertRows = async (admin: any, table: string, rows: any, select = false) => {
  if (Array.isArray(rows) && rows.length === 0) return select ? [] : null;
  const query = admin.from(table).insert(rows);
  const { data, error } = select ? await query.select() : await query;
  assertDb(table, error);
  return data;
};

// ===================== Subjects =====================
const SUBJECT_DEFS = [
  { code: "ENG", name: "English Language", department: "Languages", forms: ["Form 1","Form 2","Form 3","Form 4"] },
  { code: "MAT", name: "Mathematics", department: "Mathematics", forms: ["Form 1","Form 2","Form 3","Form 4"] },
  { code: "SHO", name: "Shona", department: "Languages", forms: ["Form 1","Form 2","Form 3","Form 4"] },
  { code: "NDE", name: "Ndebele", department: "Languages", forms: ["Form 1","Form 2","Form 3","Form 4"] },
  { code: "HIS", name: "History", department: "Humanities", forms: ["Form 1","Form 2","Form 3","Form 4","Form 5","Form 6"] },
  { code: "GEO", name: "Geography", department: "Humanities", forms: ["Form 1","Form 2","Form 3","Form 4","Form 5","Form 6"] },
  { code: "RES", name: "Religious Studies", department: "Humanities", forms: ["Form 1","Form 2","Form 3","Form 4"] },
  { code: "CSC", name: "Combined Science", department: "Sciences", forms: ["Form 1","Form 2","Form 3","Form 4"] },
  { code: "BIO", name: "Biology", department: "Sciences", forms: ["Form 4","Form 5","Form 6"] },
  { code: "CHE", name: "Chemistry", department: "Sciences", forms: ["Form 4","Form 5","Form 6"] },
  { code: "PHY", name: "Physics", department: "Sciences", forms: ["Form 4","Form 5","Form 6"] },
  { code: "PMA", name: "Pure Mathematics", department: "Mathematics", forms: ["Form 5","Form 6"] },
  { code: "ACC", name: "Accounting", department: "Commercials", forms: ["Form 3","Form 4","Form 5","Form 6"] },
  { code: "BST", name: "Business Studies", department: "Commercials", forms: ["Form 3","Form 4","Form 5","Form 6"] },
  { code: "ECO", name: "Economics", department: "Commercials", forms: ["Form 5","Form 6"] },
  { code: "LIT", name: "Literature in English", department: "Humanities", forms: ["Form 3","Form 4","Form 5","Form 6"] },
  { code: "ICT", name: "Computer Science / ICT", department: "Technical", forms: ["Form 1","Form 2","Form 3","Form 4","Form 5","Form 6"] },
  { code: "AGR", name: "Agriculture", department: "Technical", forms: ["Form 1","Form 2","Form 3","Form 4"] },
  { code: "TGR", name: "Technical Graphics", department: "Technical", forms: ["Form 1","Form 2","Form 3","Form 4"] },
  { code: "PED", name: "Physical Education", department: "Sports", forms: ["Form 1","Form 2","Form 3","Form 4","Form 5","Form 6"] },
];

// ===================== Staff =====================
const STAFF_DEFS = [
  { name: "Dr. Tendai Mukoko", dept: "Administration", role: "principal", subs: [] },
  { name: "Mr. Blessing Sibanda", dept: "Administration", role: "deputy_principal", subs: ["MAT","PHY"] },
  { name: "Mrs. Rumbidzai Moyo", dept: "Languages", role: "hod", subs: ["ENG","LIT"] },
  { name: "Mr. Farai Ncube", dept: "Sciences", role: "hod", subs: ["BIO","CHE"] },
  { name: "Mr. Tafadzwa Dube", dept: "Mathematics", role: "hod", subs: ["MAT","PMA"] },
  { name: "Mrs. Chipo Mhlanga", dept: "Commercials", role: "hod", subs: ["ACC","BST"] },
  { name: "Mr. Munyaradzi Chigumba", dept: "Humanities", role: "hod", subs: ["HIS","GEO"] },
  { name: "Mrs. Vimbai Marufu", dept: "Languages", role: "teacher", subs: ["ENG","SHO"] },
  { name: "Mr. Nkosana Ndlovu", dept: "Languages", role: "teacher", subs: ["NDE","HIS"] },
  { name: "Ms. Tsitsi Mthembu", dept: "Languages", role: "teacher", subs: ["ENG","LIT"] },
  { name: "Mr. Brian Chikwanda", dept: "Mathematics", role: "teacher", subs: ["MAT","PMA"] },
  { name: "Mrs. Tariro Mapfumo", dept: "Mathematics", role: "teacher", subs: ["MAT"] },
  { name: "Mr. Sipho Mlilo", dept: "Sciences", role: "teacher", subs: ["PHY","MAT"] },
  { name: "Mrs. Nyasha Mawere", dept: "Sciences", role: "teacher", subs: ["BIO","CSC"] },
  { name: "Mr. Tinashe Gumbo", dept: "Sciences", role: "teacher", subs: ["CHE","CSC"] },
  { name: "Mr. Bongani Mpofu", dept: "Commercials", role: "teacher", subs: ["ACC","ECO"] },
  { name: "Mrs. Ropafadzo Madziva", dept: "Commercials", role: "teacher", subs: ["BST","ECO"] },
  { name: "Mr. Thabo Banda", dept: "Humanities", role: "teacher", subs: ["GEO","RES"] },
  { name: "Mrs. Ruvarashe Nyathi", dept: "Humanities", role: "teacher", subs: ["HIS","RES"] },
  { name: "Mr. Lwazi Tshuma", dept: "Technical", role: "teacher", subs: ["ICT"] },
  { name: "Mr. Tichaona Bvute", dept: "Technical", role: "teacher", subs: ["AGR","TGR"] },
  { name: "Mrs. Sibongile Masuku", dept: "Technical", role: "teacher", subs: ["TGR","ICT"] },
  { name: "Mr. Simba Mangwende", dept: "Sports", role: "teacher", subs: ["PED"] },
  { name: "Mrs. Anesu Chitando", dept: "Languages", role: "teacher", subs: ["SHO","LIT"] },
  { name: "Mr. Kudakwashe Zhou", dept: "Sciences", role: "teacher", subs: ["BIO","PED"] },
];

// ===================== Classes =====================
const CLASS_DEFS = [
  { name: "Form 1A", form_level: "Form 1", stream: "A", combo: null, subs: ["ENG","MAT","SHO","HIS","GEO","RES","CSC","ICT","AGR","TGR","PED"] },
  { name: "Form 2A", form_level: "Form 2", stream: "A", combo: null, subs: ["ENG","MAT","SHO","HIS","GEO","RES","CSC","ICT","AGR","TGR","PED"] },
  { name: "Form 3A", form_level: "Form 3", stream: "A", combo: null, subs: ["ENG","MAT","SHO","HIS","GEO","CSC","ACC","BST","LIT","ICT"] },
  { name: "Form 4A", form_level: "Form 4", stream: "A", combo: null, subs: ["ENG","MAT","SHO","HIS","GEO","BIO","CHE","PHY","ACC","LIT"] },
  { name: "Form 5A", form_level: "Form 5", stream: "A", combo: "Sciences", subs: ["PMA","PHY","CHE","BIO"] },
  { name: "Form 6A", form_level: "Form 6", stream: "A", combo: "Commercials", subs: ["ACC","BST","ECO","PMA"] },
];

// Timetable slots (5 teaching periods/day for demo brevity)
const TT_SLOTS = [
  { start: "07:30", end: "08:10", label: "Period 1" },
  { start: "08:10", end: "08:50", label: "Period 2" },
  { start: "08:50", end: "09:30", label: "Period 3" },
  { start: "10:10", end: "10:50", label: "Period 4" },
  { start: "10:50", end: "11:30", label: "Period 5" },
  { start: "11:30", end: "12:10", label: "Period 6" },
];
const ROOMS = ["Room 1","Room 2","Room 3","Room 4","Room 5","Room 6","Room 7","Room 8","Science Lab 1","Science Lab 2","Computer Lab","Library","Hall"];

// Demo auth users
const DEMO_USERS = [
  { email: "admin@giffordhigh.demo",       password: "Demo@2025!",  name: "Demo Admin",                 role: "admin" },
  { email: "head@giffordhigh.demo",        password: "Demo@2025!",  name: "Dr. Tendai Mukoko",          role: "principal" },
  { email: "deputy@giffordhigh.demo",      password: "Demo@2025!",  name: "Mr. Blessing Sibanda",       role: "admin_supervisor" },
  { email: "finance@giffordhigh.demo",     password: "Demo@2025!",  name: "Mrs. Chipo Mhlanga",         role: "finance" },
  { email: "teacher.maths@giffordhigh.demo",  password: "Demo@2025!", name: "Mr. Brian Chikwanda",      role: "teacher" },
  { email: "teacher.english@giffordhigh.demo", password: "Demo@2025!", name: "Mrs. Rumbidzai Moyo",     role: "teacher" },
  { email: "teacher.science@giffordhigh.demo", password: "Demo@2025!", name: "Mr. Farai Ncube",         role: "teacher" },
  { email: "parent.active@giffordhigh.demo",   password: "Demo@2025!", name: "Mr. Tongai Mutasa",       role: "parent" },
  { email: "parent.expired@giffordhigh.demo",  password: "Demo@2025!", name: "Mrs. Tsitsi Ndlovu",      role: "parent" },
  { email: "parent.pending@giffordhigh.demo",  password: "Demo@2025!", name: "Mr. Munashe Dube",        role: "parent" },
  { email: "student.top@giffordhigh.demo",     password: "Demo@2025!", name: "Tadiwanashe Mutasa",      role: "student" },
  { email: "student.normal@giffordhigh.demo",  password: "Demo@2025!", name: "Anesu Sibanda",           role: "student" },
  { email: "student.atrisk@giffordhigh.demo",  password: "Demo@2025!", name: "Takudzwa Dube",           role: "student" },
];

// ===================== Handler =====================
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

    // Verify caller is admin. getClaims is not available in this edge runtime,
    // so validate the bearer token through the supported getUser API.
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const callerId = userData.user.id;

    const admin = createClient(url, service);
    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", callerId);
    const callerRoles = (roleRows || []).map((r: any) => r.role);
    if (!callerRoles.includes("admin")) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const log: string[] = [];
    const push = (s: string) => { log.push(s); console.log(s); };

    // ============== WIPE ==============
    push("Wiping demo-eligible tables via TRUNCATE CASCADE…");
    {
      const { error } = await admin.rpc("wipe_demo_data");
      assertDb("wipe_demo_data", error);
    }

    // Remove previous demo auth users (staff already truncated above)
    const existing = await listAllAuthUsers(admin);
    const demoEmails = new Set(DEMO_USERS.map(u => u.email));
    for (const u of existing) {
      if (u.email && demoEmails.has(u.email)) {
        const { error: roleDeleteError } = await admin.from("user_roles").delete().eq("user_id", u.id);
        assertDb("user_roles", roleDeleteError);
        const { error: profileDeleteError } = await admin.from("profiles").delete().eq("id", u.id);
        assertDb("profiles", profileDeleteError);
        const { error: authDeleteError } = await admin.auth.admin.deleteUser(u.id);
        if (authDeleteError) throw tableError("auth.users", authDeleteError.message || String(authDeleteError));
      }
    }

    // ============== AUTH USERS ==============
    push("Creating demo auth users…");
    const demoUserIds: Record<string, string> = {};
    for (const du of DEMO_USERS) {
      const { data, error } = await admin.auth.admin.createUser({
        email: du.email,
        password: du.password,
        email_confirm: true,
        user_metadata: { full_name: du.name },
      });
      if (error) { push(`  ! ${du.email}: ${error.message}`); continue; }
      demoUserIds[du.email] = data.user!.id;
      await insertRows(admin, "user_roles", { user_id: data.user!.id, role: du.role });
    }

    // ============== SUBJECTS ==============
    push("Inserting subjects…");
    const subjectRows = SUBJECT_DEFS.map(s => ({
      name: s.name, code: s.code, department: s.department, form_levels: s.forms, is_examinable: true,
    }));
    const { data: subjectsIns, error: subErr } = await admin
      .from("subjects")
      .insert(subjectRows)
      .select();
    assertDb("subjects", subErr);
    const subjByCode: Record<string, any> = {};
    for (const s of subjectsIns!) {
      const def = SUBJECT_DEFS.find(d => d.name === s.name)!;
      subjByCode[def.code] = s;
    }

    // ============== STAFF ==============
    push("Inserting staff…");
    const staffRows = STAFF_DEFS.map((sd, i) => {
      const emailMap: Record<string, string> = {
        "Dr. Tendai Mukoko": "head@giffordhigh.demo",
        "Mr. Blessing Sibanda": "deputy@giffordhigh.demo",
        "Mrs. Chipo Mhlanga": "finance@giffordhigh.demo",
        "Mr. Brian Chikwanda": "teacher.maths@giffordhigh.demo",
        "Mrs. Rumbidzai Moyo": "teacher.english@giffordhigh.demo",
        "Mr. Farai Ncube": "teacher.science@giffordhigh.demo",
      };
      const linkedEmail = emailMap[sd.name];
      return {
        full_name: sd.name,
        title: sd.role === "principal" ? "Headmaster"
          : sd.role === "deputy_principal" ? "Deputy Head"
          : sd.role === "hod" ? "Head of Department"
          : "Teacher",
        department: sd.dept,
        category: "academic",
        role: sd.role,
        staff_number: `GHS-T-${pad(i + 1, 3)}`,
        email: linkedEmail || `${sd.name.toLowerCase().replace(/[^a-z]+/g, ".")}@giffordhigh.co.zw`,
        phone: zwPhone(),
        subjects_taught: sd.subs,
        address: rand(SUBURBS),
        emergency_contact: zwPhone(),
        employment_date: `202${randInt(0, 4)}-0${randInt(1,9)}-1${randInt(0,9)}`,
        qualifications: rand(["BEd (UZ)","BSc Hons (NUST)","MEd (MSU)","BA Hons (UZ)","Dip Ed (Hillside)"]),
        status: "active",
        user_id: linkedEmail ? demoUserIds[linkedEmail] : null,
      };
    });
    const staffIns = await insertRows(admin, "staff", staffRows, true);
    const staffByName: Record<string, any> = {};
    for (const s of staffIns!) staffByName[s.full_name] = s;

    // ============== CLASSES ==============
    push("Inserting classes…");
    const formTeacherNames = [
      "Mrs. Vimbai Marufu","Mr. Nkosana Ndlovu","Mrs. Tariro Mapfumo",
      "Mr. Tinashe Gumbo","Mr. Brian Chikwanda","Mr. Bongani Mpofu",
    ];
    const classRows = CLASS_DEFS.map((c, i) => ({
      name: c.name, form_level: c.form_level, stream: c.stream,
      class_teacher_id: staffByName[formTeacherNames[i]].id,
      room: `Room ${i + 1}`, capacity: 40,
    }));
    const classesIns = await insertRows(admin, "classes", classRows, true);
    const classByName: Record<string, any> = {};
    for (const c of classesIns!) classByName[c.name] = c;

    // ============== CLASS_SUBJECTS ==============
    push("Linking subjects to classes…");
    const classSubjectRows: any[] = [];
    for (const cd of CLASS_DEFS) {
      const cls = classByName[cd.name];
      for (const sc of cd.subs) {
        const subj = subjByCode[sc];
        if (!subj) continue;
        const eligibleStaff = STAFF_DEFS.filter(sd => sd.subs.includes(sc));
        const tname = eligibleStaff.length ? rand(eligibleStaff).name : null;
        classSubjectRows.push({
          class_id: cls.id, subject_id: subj.id,
          teacher_id: tname ? staffByName[tname].id : null,
        });
      }
    }
    await insertRows(admin, "class_subjects", classSubjectRows);

    // ============== TIMETABLE ==============
    push("Generating timetable…");
    const ttRows: any[] = [];
    for (const cd of CLASS_DEFS) {
      const cls = classByName[cd.name];
      const subjPool = cd.subs.map(c => subjByCode[c]).filter(Boolean);
      for (let day = 1; day <= 5; day++) {
        for (let p = 0; p < TT_SLOTS.length; p++) {
          const subj = subjPool[(day + p) % subjPool.length];
          const teacherDef = STAFF_DEFS.find(sd => sd.subs.includes(SUBJECT_DEFS.find(s => s.name === subj.name)!.code));
          ttRows.push({
            class_id: cls.id, subject_id: subj.id,
            teacher_id: teacherDef ? staffByName[teacherDef.name].id : null,
            day_of_week: day,
            start_time: TT_SLOTS[p].start, end_time: TT_SLOTS[p].end,
            room: rand(ROOMS), academic_year: "2025", term: "Term 2",
          });
        }
      }
    }
    await insertRows(admin, "timetable_entries", ttRows);

    // ============== FEE STRUCTURES ==============
    push("Inserting fee structures…");
    const feeRows: any[] = [];
    for (const term of ["Term 1","Term 2","Term 3"]) {
      for (const form of ["Form 1","Form 2","Form 3","Form 4"]) {
        feeRows.push({ academic_year: "2025", term, form, boarding_status: "day", description: `${form} Tuition (${term})`, amount_usd: 180, amount_zig: 4860, is_active: true });
        feeRows.push({ academic_year: "2025", term, form, boarding_status: "day", description: `${form} Levy (${term})`, amount_usd: 30, amount_zig: 810, is_active: true });
      }
      for (const form of ["Form 5","Form 6"]) {
        feeRows.push({ academic_year: "2025", term, form, boarding_status: "day", description: `${form} Tuition (${term})`, amount_usd: 220, amount_zig: 5940, is_active: true });
        feeRows.push({ academic_year: "2025", term, form, boarding_status: "day", description: `${form} Levy (${term})`, amount_usd: 30, amount_zig: 810, is_active: true });
      }
    }
    await insertRows(admin, "fee_structures", feeRows);

    // ============== STUDENTS ==============
    push("Inserting 180 students…");
    let admissionCounter = 1;
    const allStudents: any[] = [];
    const demoStudentMeta: Record<string, { name: string; form: string; stream: string }> = {
      "student.top@giffordhigh.demo":    { name: "Tadiwanashe Mutasa", form: "Form 4", stream: "A" },
      "student.normal@giffordhigh.demo": { name: "Anesu Sibanda",      form: "Form 3", stream: "A" },
      "student.atrisk@giffordhigh.demo": { name: "Takudzwa Dube",      form: "Form 2", stream: "A" },
    };

    for (const cd of CLASS_DEFS) {
      const baseAge = ({ "Form 1": 13, "Form 2": 14, "Form 3": 15, "Form 4": 16, "Form 5": 17, "Form 6": 18 } as any)[cd.form_level];
      for (let i = 0; i < 30; i++) {
        const gender: "M" | "F" = i % 2 === 0 ? "M" : "F";
        const name = fullName(gender);
        const dob = new Date(2025 - baseAge, randInt(0,11), randInt(1,28));
        allStudents.push({
          admission_number: `GHS-2025-${pad(admissionCounter++, 4)}`,
          full_name: name,
          date_of_birth: isoDate(dob),
          form: cd.form_level, stream: cd.stream,
          subject_combination: cd.combo,
          gender: gender === "M" ? "Male" : "Female",
          guardian_name: `${rand(["Mr.","Mrs."])} ${rand(SURNAMES)}`,
          guardian_phone: zwPhone(),
          guardian_email: `${name.split(" ")[1].toLowerCase()}.guardian@example.co.zw`,
          emergency_contact: zwPhone(),
          address: rand(SUBURBS),
          enrollment_date: `2025-01-${pad(randInt(8, 28), 2)}`,
          status: "active",
          boarding_status: "day",
        });
      }
    }
    // Overlay demo students in chosen classes — replace first row in each target class
    const overlay = (email: string, idxOffset: number) => {
      const m = demoStudentMeta[email]; if (!m) return;
      const classIdx = CLASS_DEFS.findIndex(c => c.form_level === m.form);
      const rowIdx = classIdx * 30 + idxOffset;
      allStudents[rowIdx] = {
        ...allStudents[rowIdx],
        full_name: m.name,
        gender: "Male",
        user_id: demoUserIds[email],
      };
    };
    overlay("student.top@giffordhigh.demo", 0);
    overlay("student.normal@giffordhigh.demo", 0);
    overlay("student.atrisk@giffordhigh.demo", 0);

    const studentsIns = await insertRows(admin, "students", allStudents, true);
    push(`  inserted ${studentsIns!.length} students`);

    // Bucket students by class for downstream linking
    const studentsByClass: Record<string, any[]> = {};
    for (const c of CLASS_DEFS) studentsByClass[c.name] = [];
    for (const s of studentsIns!) {
      const cls = CLASS_DEFS.find(c => c.form_level === s.form && c.stream === s.stream);
      if (cls) studentsByClass[cls.name].push(s);
    }

    // ============== PARENTS & SUBSCRIPTIONS ==============
    push("Linking demo parents to children…");
    const parentLinks = [
      { email: "parent.active@giffordhigh.demo",  childCount: 2, status: "active",     plan: "term" },
      { email: "parent.expired@giffordhigh.demo", childCount: 1, status: "expired",    plan: "term" },
      { email: "parent.pending@giffordhigh.demo", childCount: 1, status: "free_trial", plan: "monthly" },
    ];
    for (const pl of parentLinks) {
      const pid = demoUserIds[pl.email]; if (!pid) continue;
      const kids = pick(studentsIns!, pl.childCount);
      for (const k of kids) {
        await insertRows(admin, "parent_students", { parent_id: pid, student_id: k.id });
        // Update auto-created portal_subscription to demo status
        const { error: subscriptionUpdateError } = await admin.from("portal_subscriptions").update({
          status: pl.status,
          plan_type: pl.plan,
          trial_end_date: pl.status === "expired" ? "2025-04-30" : isoDate(new Date(Date.now() + 30 * 86400000)),
        }).eq("parent_id", pid).eq("student_id", k.id);
        assertDb("portal_subscriptions", subscriptionUpdateError);
      }
    }

    // ============== MARKS (Term 1 complete + Term 2 Test 1) ==============
    push("Generating marks…");
    const marksRows: any[] = [];
    const atRiskIds = new Set<string>();
    const topIds = new Set<string>();
    for (const cd of CLASS_DEFS) {
      const cls = classByName[cd.name];
      const students = studentsByClass[cd.name];
      // First two students = at-risk; last student = top performer
      for (let i = 0; i < students.length; i++) {
        const s = students[i];
        const tier: "top" | "avg" | "low" =
          (s.full_name === "Tadiwanashe Mutasa" || i === students.length - 1) ? "top" :
          (s.full_name === "Takudzwa Dube" || i < 2) ? "low" : "avg";
        if (tier === "top") topIds.add(s.id);
        if (tier === "low") atRiskIds.add(s.id);
        for (const sc of cd.subs) {
          const subj = subjByCode[sc]; if (!subj) continue;
          const tDef = STAFF_DEFS.find(sd => sd.subs.includes(sc));
          if (!tDef) continue;
          const teacherStaffId = staffByName[tDef.name].id;
          const base = tier === "top" ? 80 : tier === "avg" ? 60 : 40;
          const mk = (t: string, type: string, drift = 0) => ({
            student_id: s.id, subject_id: subj.id, teacher_id: teacherStaffId,
            mark: Math.max(20, Math.min(99, base + randInt(-8, 8) + drift)),
            assessment_type: type, term: t,
            description: type === "exam" ? "End of Term Exam" : type === "test" ? "Class Test" : "Assignment",
            comment: tier === "top" ? "Excellent work" : tier === "low" ? "Needs more effort" : "Good progress",
          });
          marksRows.push(mk("Term 1", "test"));
          marksRows.push(mk("Term 1", "test", 2));
          marksRows.push(mk("Term 1", "exam", tier === "low" ? -3 : 1));
          marksRows.push(mk("Term 2", "test", tier === "low" ? -5 : 0));
        }
      }
    }
    // Insert marks in batches
    for (let i = 0; i < marksRows.length; i += 500) {
      const slice = marksRows.slice(i, i + 500);
      await insertRows(admin, "marks", slice);
    }
    push(`  inserted ${marksRows.length} marks`);

    // ============== ATTENDANCE (last 10 school days) ==============
    push("Generating 2-weeks attendance…");
    const today = new Date();
    const schoolDays: Date[] = [];
    const cursor = new Date(today); cursor.setDate(cursor.getDate() - 1);
    while (schoolDays.length < 10) {
      const dow = cursor.getDay();
      if (dow >= 1 && dow <= 5) schoolDays.push(new Date(cursor));
      cursor.setDate(cursor.getDate() - 1);
    }
    const attRows: any[] = [];
    for (const cd of CLASS_DEFS) {
      const cls = classByName[cd.name];
      for (const s of studentsByClass[cd.name]) {
        const isAtRisk = atRiskIds.has(s.id);
        for (let i = 0; i < schoolDays.length; i++) {
          const d = schoolDays[i];
          let status: string;
          if (isAtRisk) {
            // Worse pattern in recent days
            const r = Math.random() - (i < 5 ? 0.25 : 0.1);
            status = r > 0.55 ? "present" : r > 0.25 ? "absent" : "late";
          } else {
            const r = Math.random();
            status = r > 0.05 ? "present" : r > 0.02 ? "late" : "absent";
          }
          attRows.push({ student_id: s.id, class_id: cls.id, attendance_date: isoDate(d), status });
        }
      }
    }
    for (let i = 0; i < attRows.length; i += 1000) {
      await insertRows(admin, "attendance", attRows.slice(i, i + 1000));
    }
    push(`  inserted ${attRows.length} attendance rows`);

    // ============== EXAMS + EXAM TIMETABLE ==============
    push("Creating Term 2 exams + timetable…");
    const examStart = new Date(); examStart.setDate(examStart.getDate() + 14);
    const examEnd = new Date(examStart); examEnd.setDate(examEnd.getDate() + 10);
    const examIdByForm: Record<string, string> = {};
    for (const cd of CLASS_DEFS) {
      const subjIds = cd.subs.map(c => subjByCode[c].id);
      const { data: e } = await admin.from("exams").insert({
        name: `${cd.form_level} End of Term 2 Exam`,
        exam_type: "end_of_term", form_level: cd.form_level,
        term: "Term 2", academic_year: "2025",
        start_date: isoDate(examStart), end_date: isoDate(examEnd),
        subject_ids: subjIds, is_published: true,
      }).select().single();
      if (e) examIdByForm[cd.form_level] = e.id;

      // Timetable entries: spread subjects across morning/afternoon
      const tRows: any[] = [];
      let day = 0;
      for (const sc of cd.subs) {
        const subj = subjByCode[sc];
        const d = new Date(examStart); d.setDate(d.getDate() + Math.floor(day / 2));
        if (d.getDay() === 0) d.setDate(d.getDate() + 1);
        if (d.getDay() === 6) d.setDate(d.getDate() + 2);
        const morning = day % 2 === 0;
        tRows.push({
          exam_id: e!.id, subject_id: subj.id,
          exam_date: isoDate(d),
          start_time: morning ? "08:00" : "13:00",
          end_time:   morning ? "10:30" : "15:30",
          venue: rand(["Hall","Library","Room 10","Room 12"]),
        });
        day++;
      }
      await admin.from("exam_timetable_entries").insert(tRows);
    }

    // ============== LESSON PLANS ==============
    push("Generating lesson plans…");
    const lpRows: any[] = [];
    const lpTopics = [
      { sub: "MAT", form: "Form 2", title: "Algebra: Solving Linear Equations" },
      { sub: "ENG", form: "Form 4", title: "Essay Writing: Persuasive Techniques" },
      { sub: "BIO", form: "Form 5", title: "Cell Structure and Function" },
      { sub: "HIS", form: "Form 3", title: "Zimbabwe Liberation War: Causes" },
      { sub: "GEO", form: "Form 1", title: "Introduction to Map Reading" },
      { sub: "ACC", form: "Form 6", title: "Final Accounts: Trial Balance" },
      { sub: "CHE", form: "Form 4", title: "Acids, Bases and Salts" },
      { sub: "PHY", form: "Form 5", title: "Newton's Laws of Motion" },
      { sub: "ICT", form: "Form 3", title: "Spreadsheets: Formulas & Functions" },
      { sub: "SHO", form: "Form 2", title: "Tsumo neMadimikira" },
      { sub: "PED", form: "Form 1", title: "Athletics: Sprinting Technique" },
      { sub: "BST", form: "Form 4", title: "Forms of Business Ownership" },
      { sub: "AGR", form: "Form 2", title: "Maize Production Cycle" },
      { sub: "LIT", form: "Form 6", title: "Shakespeare: Macbeth Act 1" },
      { sub: "TGR", form: "Form 3", title: "Orthographic Projection" },
    ];
    for (const lp of lpTopics) {
      const cd = CLASS_DEFS.find(c => c.form_level === lp.form && c.subs.includes(lp.sub));
      if (!cd) continue;
      const cls = classByName[cd.name];
      const subj = subjByCode[lp.sub];
      const tDef = STAFF_DEFS.find(sd => sd.subs.includes(lp.sub))!;
      lpRows.push({
        teacher_id: staffByName[tDef.name].user_id || staffByName[tDef.name].id,
        subject_id: subj.id, class_id: cls.id,
        title: lp.title,
        date: isoDate(new Date(Date.now() + randInt(-7, 14) * 86400000)),
        duration_minutes: 40,
        objectives: "Students will be able to: understand the topic, apply concepts, demonstrate mastery.",
        materials_needed: "Textbook, whiteboard, worksheets",
        introduction: "Recap of previous lesson; introduce new concept with relatable example.",
        main_activity: "Guided practice followed by group exercises and peer review.",
        conclusion: "Recap key points; preview next lesson.",
        assessment_strategy: "Q&A, exit ticket, short quiz.",
        homework_notes: "Complete textbook exercises 1-5.",
        status: "published",
      });
    }
    if (lpRows.length) {
      const { error } = await admin.from("lesson_plans").insert(lpRows);
      if (error) push(`  ! lesson_plans: ${error.message}`);
    }

    // ============== ANNOUNCEMENTS + EVENTS ==============
    push("Inserting announcements and events…");
    await admin.from("announcements").insert([
      { title: "Term 2 Fees — Final Reminder", content: "All Term 2 fees are due by end of week. Please settle outstanding balances via EcoCash, Paynow or Bank Transfer.", is_public: true, target_type: "whole_school" },
      { title: "Mid-Term Exams Schedule Released", content: "End-of-term exam timetable is now available on your dashboard.", is_public: true, target_type: "whole_school" },
      { title: "Parent–Teacher Conference", content: "Scheduled for next Saturday in the school hall, 09:00 – 13:00.", is_public: true, target_type: "whole_school" },
      { title: "Sports Day 2025", content: "Annual Inter-House Athletics — all houses to confirm participants by Friday.", is_public: true, target_type: "whole_school" },
      { title: "Form 4 & 6 Mock Exam Preparation Workshop", content: "Compulsory revision week starting Monday.", is_public: true, target_type: "form", target_ids: ["Form 4","Form 6"] },
      { title: "ZESA Load-shedding Notice", content: "Power cuts expected Tue & Thu 06:00 – 11:00. ICT lessons rescheduled.", is_public: true, target_type: "whole_school" },
      { title: "Career Guidance Day", content: "University of Zimbabwe and NUST representatives visiting Form 6.", is_public: true, target_type: "form", target_ids: ["Form 6"] },
      { title: "Boarding House Maintenance", content: "Heaters in dorms serviced this weekend.", is_public: true, target_type: "whole_school" },
      { title: "Cultural Day Celebration", content: "Traditional dress encouraged. Cultural performances after lunch.", is_public: true, target_type: "whole_school" },
      { title: "Term Closes 15 August", content: "End-of-term assembly at 11:00 in the Hall.", is_public: true, target_type: "whole_school" },
    ]);

    const evBase = new Date();
    const ev = (d: number, title: string, type: string, desc: string) => ({
      title, description: desc, event_date: isoDate(new Date(evBase.getTime() + d * 86400000)), event_type: type,
    });
    await admin.from("events").insert([
      ev(3,  "Inter-House Athletics", "sports", "Annual athletics meet — Sports Field"),
      ev(7,  "Parent–Teacher Conference", "meeting", "School Hall, 09:00 – 13:00"),
      ev(10, "Form 6 Career Guidance Day", "academic", "Hall — UZ & NUST presentations"),
      ev(14, "Term 2 End-of-Term Exams Begin", "exam", "All forms"),
      ev(28, "Term 2 Prize Giving Ceremony", "ceremony", "Hall — 14:00"),
      ev(30, "Mid-Term Break", "holiday", "School closed"),
      ev(35, "Cultural Day", "cultural", "Performances and traditional cuisine"),
      ev(42, "Science Fair", "academic", "Lab 1 & 2 — Form 4–6 projects"),
      ev(49, "Sports Day", "sports", "Inter-house finals"),
      ev(60, "Term 2 Closes", "general", "End-of-term assembly 11:00"),
    ]);

    // ============== PAYMENTS (against auto-generated Term 2 invoices) ==============
    push("Recording payments on auto-generated invoices…");
    const { data: invs } = await admin.from("invoices").select("id,student_id,total_usd,term").eq("term","Term 2");
    if (invs && invs.length) {
      const payRows: any[] = [];
      let receiptCounter = 1;
      for (const inv of invs) {
        const r = Math.random();
        let amt = 0;
        if (r < 0.65) amt = Number(inv.total_usd); // fully paid
        else if (r < 0.85) amt = Math.round(Number(inv.total_usd) * 0.5); // partial
        else amt = 0; // unpaid
        if (amt > 0) {
          payRows.push({
            receipt_number: `RCT-${pad(receiptCounter++, 6)}`,
            invoice_id: inv.id, student_id: inv.student_id,
            amount_usd: amt, amount_zig: 0,
            payment_method: rand(["cash","ecocash","paynow","bank_transfer","swipe"]),
            reference_number: `TX${randInt(100000, 999999)}`,
            payment_date: isoDate(new Date(Date.now() - randInt(1, 30) * 86400000)),
            notes: "Seed demo payment",
          });
        }
      }
      for (let i = 0; i < payRows.length; i += 500) {
        const { error } = await admin.from("payments").insert(payRows.slice(i, i + 500));
        if (error) push(`  ! payments batch: ${error.message}`);
      }
      push(`  recorded ${payRows.length} payments`);
    }

    // ============== AI USAGE LOGS (audit_logs) ==============
    push("Logging AI usage entries…");
    const aiFeatures = [
      "ai_report_comment_generated",
      "ai_lesson_plan_generated",
      "ai_parent_message_drafted",
      "ai_timetable_generated",
      "ai_substitute_suggested",
      "ai_fee_default_predicted",
      "ai_mcq_questions_generated",
      "ai_submission_marked",
    ];
    const aiRows: any[] = [];
    for (let i = 0; i < 18; i++) {
      aiRows.push({
        user_id: demoUserIds["admin@giffordhigh.demo"] || callerId,
        action: rand(aiFeatures),
        table_name: "ai_logs",
        new_data: {
          model: "google/gemini-2.5-flash",
          tokens_in: randInt(300, 1500),
          tokens_out: randInt(150, 900),
          accepted: Math.random() > 0.25,
          at: new Date(Date.now() - randInt(0, 14) * 86400000).toISOString(),
        },
      });
    }
    await admin.from("audit_logs").insert(aiRows);

    push("✅ Seed complete.");

    return new Response(JSON.stringify({
      ok: true,
      summary: {
        subjects: subjectsIns!.length,
        staff: staffIns!.length,
        classes: classesIns!.length,
        students: studentsIns!.length,
        timetable_entries: ttRows.length,
        marks: marksRows.length,
        attendance: attRows.length,
        demo_users: Object.keys(demoUserIds).length,
      },
      log,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
