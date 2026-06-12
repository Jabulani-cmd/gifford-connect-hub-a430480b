# Gifford High School — Demo Credentials

All demo accounts share the same password: **`Demo@2025!`**

Run **Reset Demo Data** from the Admin dashboard header to (re-)create these
accounts plus 180 students, 25 staff, 6 classes (Form 1A → 6A), full Term 2
timetable, marks, attendance, fees, payments, exam timetable, lesson plans,
announcements and AI usage logs.

> Use **only** on demo environments — running the reset wipes existing
> academic, finance, attendance, exam and timetable data.

## Administration

| Role               | Email                              | Password     |
|--------------------|------------------------------------|--------------|
| Admin              | `admin@giffordhigh.demo`           | `Demo@2025!` |
| Head of School     | `head@giffordhigh.demo`            | `Demo@2025!` |
| Deputy (Supervisor)| `deputy@giffordhigh.demo`          | `Demo@2025!` |
| Finance            | `finance@giffordhigh.demo`         | `Demo@2025!` |

## Teachers

| Department     | Email                                   | Password     |
|----------------|-----------------------------------------|--------------|
| Mathematics    | `teacher.maths@giffordhigh.demo`        | `Demo@2025!` |
| English/Lit    | `teacher.english@giffordhigh.demo`      | `Demo@2025!` |
| Sciences       | `teacher.science@giffordhigh.demo`      | `Demo@2025!` |

## Parents (for paywall / subscription demo)

| Status   | Email                                | Password     | Notes |
|----------|--------------------------------------|--------------|-------|
| Active   | `parent.active@giffordhigh.demo`     | `Demo@2025!` | 2 linked children, term plan |
| Expired  | `parent.expired@giffordhigh.demo`    | `Demo@2025!` | Use for renewal/payment flow |
| Pending  | `parent.pending@giffordhigh.demo`    | `Demo@2025!` | Free-trial → monthly plan    |

## Students

| Profile        | Email                                  | Password     | Class    |
|----------------|----------------------------------------|--------------|----------|
| Top performer  | `student.top@giffordhigh.demo`         | `Demo@2025!` | Form 4A  |
| Normal         | `student.normal@giffordhigh.demo`      | `Demo@2025!` | Form 3A  |
| At-risk        | `student.atrisk@giffordhigh.demo`      | `Demo@2025!` | Form 2A  |

## AI-feature demo hooks

- **At-risk alerts**: first two students in every class have low marks +
  declining attendance.
- **Top performer**: last student in every class (plus `student.top`).
- **Fee defaulters**: ~15 % of Term 2 invoices left unpaid + 20 % partial.
- **Substitute / timetable conflicts**: covered by the AI Timetable Generator.
- **AI usage logs**: 18 entries pre-populated in audit logs (`ai_*` actions).
