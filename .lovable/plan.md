# AI Timetable Generator

A Lovable AI agent generates the full-school class timetable and per-exam exam timetables from existing data plus two small admin lists. Admin reviews a draft, then publishes it to all portals.

## 1. New admin inputs

Two new tables managed inside Admin Portal → Timetable Management:

- **`teaching_venues`** — name, type (classroom/lab/hall/field), capacity, is_active. Replaces the free-text `room` field as the source of truth.
- **`subject_period_requirements`** — per (form_level, subject_id): periods_per_week. Defaults seeded for each form/subject (5 periods/week) and editable inline.

Existing inputs reused as-is: `classes`, `subjects`, `staff`, `class_subjects` (teacher↔subject↔class mapping), `lesson_slots`, and `exams` / `exam_timetable_entries` for exams.

## 2. Generate → Preview → Publish flow

New top section in Timetable Management:

```text
┌────────────────────────────────────────────────────────────┐
│  AI Timetable Generator                                    │
│  Inputs: 12 classes · 18 subjects · 24 teachers · 8 venues │
│                                                            │
│  [ Generate Class Timetable ]   Last generated: —          │
└────────────────────────────────────────────────────────────┘
```

Clicking **Generate** calls a new edge function `generate-timetable` which:

1. Loads classes, class_subjects (teacher per subject per class), period requirements, lesson slots (lesson type only), active venues.
2. Sends a compact JSON brief to Lovable AI (`google/gemini-2.5-pro`) with the system prompt: "You are a school timetable planner. Produce a 5-day timetable. Hard rule: no teacher teaches two classes in the same slot. Prefer spreading the same subject across days. Return strict JSON."
3. Validates the AI output with Zod (array of `{class_id, day, slot_index, subject_id, teacher_id, venue_id}`).
4. Runs a deterministic post-pass that re-checks every teacher slot; if a clash slips through, the function swaps or blanks the offending cell and re-asks the AI to repair only those cells (max 2 repair rounds).
5. Returns the draft (does NOT write to `timetable_entries`).

Admin sees the draft rendered in the existing weekly grid with a yellow "DRAFT — not yet visible to students/parents" banner and a per-class tab. Two buttons:

- **Publish to all portals** — wipes existing `timetable_entries` and inserts the draft in one transaction (calls existing realtime channel, which already pushes to portals).
- **Discard draft**.

Drafts persist in a new `timetable_drafts` table so admin can leave the page and come back.

## 3. Exam timetable generator

Same pattern, scoped to one exam at a time. New button on each exam in `ExamTimetableTab`:

```text
[ AI Generate Exam Schedule ]
```

Calls `generate-exam-timetable` with: exam metadata, subjects to be examined (from `class_subjects` for that form), available exam dates (admin picks start + end date), session windows (Morning 08:00–10:30, Afternoon 11:00–13:30), exam venues (halls only).

AI produces `{subject_id, exam_date, start_time, end_time, venue_id, invigilator_staff_id}` per subject. Hard rules in the prompt:
- No student writes two exams in the same session (every student in the form takes every subject exam, so each session has one subject only per form).
- An invigilator cannot be assigned to two simultaneous sessions.
- Invigilators are drawn from `staff` whose teaching slot in the regular timetable does not conflict with the exam session (the function pre-computes the eligible invigilator pool per session).

Same Generate → Preview (existing exam timetable view, shown in draft mode) → Publish flow.

## 4. Sync guarantee

Existing `timetable_entries` realtime subscriptions on Student/Parent portals already pick up changes (already wired in `StudentTimetableTab`). Publish writes via `supabase.from('timetable_entries').insert(...)`, which fires `postgres_changes` to all subscribers. Same for `exam_timetable_entries`.

## Technical details

- **Edge functions**: `supabase/functions/generate-timetable/index.ts` and `generate-exam-timetable/index.ts`. Both use the AI Gateway provider helper, model `google/gemini-2.5-pro`, structured output via Zod schema (validated server-side), and return the draft JSON. Verify-jwt enabled; require admin/principal role.
- **DB migrations**:
  - `teaching_venues (id, name, venue_type, capacity, is_active)`
  - `subject_period_requirements (id, form_level, subject_id, periods_per_week)` — UNIQUE (form_level, subject_id)
  - `timetable_drafts (id, draft_type 'class'|'exam', scope_id nullable, draft_json, created_by, created_at)`
  - Add `venue_id uuid` columns to `timetable_entries` and `exam_timetable_entries` (keep `room`/`venue` text columns for backward compatibility, populate both on publish).
  - RLS: admin/principal/deputy_principal/admin_supervisor full access, authenticated read for venues + period requirements.
- **Frontend**:
  - New `VenuesManager.tsx` and `PeriodRequirementsManager.tsx` components in `src/components/admin/`.
  - New `AITimetableGenerator.tsx` (class) and an "AI Generate" button inside `ExamTimetableTab.tsx`.
  - Draft preview reuses `FullWeekTimetable` with a `draft` prop that adds the yellow banner.
  - Wired into `AdminDashboard.tsx` Timetable Management tab.
- **Clash repair loop**: deterministic JS pass after AI response; fixes guarantee no teacher double-booking even if the model slips.
- **Audit**: every Publish writes to `audit_logs` with the diff size (entries added/removed).

## Out of scope (for this iteration)

- Venue/student double-booking beyond teacher (admin chose teacher-only).
- Sport/club period auto-allocation (still managed via existing sports schedule).
- Auto-rebalancing when a single class subject is later edited (admin re-runs the generator).
