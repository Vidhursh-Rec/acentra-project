# Backend Spec — CareBridge MVP

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Python FastAPI |
| Database | Supabase (Postgres) |
| Auth | JWT, role-based (patient / hub_manager / viewer / doctor / management) |
| AI Extraction + Safety Flag | Groq `openai/gpt-oss-120b` |
| AI Translation + Rewrite | Groq `openai/gpt-oss-20b` |
| PDF/Image | pdfplumber + pytesseract (OCR) |
| Scheduler | APScheduler (missed dose + escalation cron jobs) |
| Hosting | Render or Railway (free tier) |

---

## Auth Routes

| Method | Route | What it does |
|---|---|---|
| POST | `/auth/login` | Login for all roles. Returns JWT with role + user ID. |
| POST | `/auth/family/join` | Family member joins using patient ID, picks role (hub_manager / viewer). Auto-assigns viewer if hub_manager slot taken. |

---

## Patient Routes

| Method | Route | What it does |
|---|---|---|
| POST | `/patient/upload` | Receive PDF/image/text discharge summary. Store file. Trigger agent pipeline. |
| GET | `/patient/status` | Return current plan status: rejected / pending_review / approved. |
| GET | `/patient/rejection` | Return rejection reason in patient's chosen language. |

---

## Agent Pipeline (internal, triggered after upload)

| Step | What it does |
|---|---|
| Validate | Reject if unreadable, not a discharge summary, or missing key info. |
| Extract | LLM pulls meds, appointments, tests, referrals, care instructions, dates, warning signs. Each item stores exact source quote. |
| Verify | Rules confirm each quote exists in source text. Resolve relative dates from discharge date. |
| Safety Flag | Mark item `needs_review` if: missing dose/frequency/date, vague text, conflicting instructions, low confidence. |
| Plan Sheet | Structure plan items. Route to assigned doctor. |

---

## Doctor Routes

| Method | Route | What it does |
|---|---|---|
| GET | `/doctor/patients` | List of assigned patients with approval status + overdue flag. |
| GET | `/doctor/patient/:id/discharge` | Return raw discharge summary for split view left panel. |
| GET | `/doctor/patient/:id/plan` | Return AI-generated plan sheet with source quotes + needs_review flags. |
| PATCH | `/doctor/patient/:id/plan/:item_id` | Doctor edits a single plan item inline. |
| POST | `/doctor/patient/:id/approve` | Approve plan. Triggers Schedule + Translate steps. |
| GET | `/doctor/calendar` | Return doctor's own appointment calendar. |

---

## Schedule Step (internal, triggered after approval)

| What it does |
|---|
| Create Task rows for every plan item with scheduled_at times. |
| Set all tasks to Pending. |
| Create calendar entries for appointments. |

---

## Translate Step (internal, triggered after approval)

| What it does |
|---|
| Generate EN/TA/HI text for every plan item. Store all 3 versions. |
| Medication text uses fixed template from structured fields (drug, dose, time). Never free-translate drug names or doses. |
| If doctor edits after approval: retranslate edited items only. Replace old reminders. |

---

## Reminder & Task Routes

| Method | Route | What it does |
|---|---|---|
| GET | `/patient/reminders/today` | Return today's tasks grouped by Morning / Afternoon / Night in patient's language. |
| PATCH | `/task/:id/done` | Mark task done. Record marked_by + marked_at. Auto-set Completed or Taken Late. |
| GET | `/patient/calendar` | Return appointment calendar events. |

---

## Missed Dose Cron (APScheduler)

| What it does |
|---|
| Before each slot: check if previous slot tasks marked. |
| If not marked → set status Missed → push notification to all family members (Hub Manager + Viewer). |
| Notification text: "Morning dose of Dolo 650 (7:30 AM) not marked." Never medical advice. |
| If no next slot today → alert after 4 hours (configurable). |

---

## Escalation Cron (APScheduler)

| What it does |
|---|
| Every hour: check pending approvals older than 12 hours (configurable). |
| Flag as overdue in DB. Management console shows overdue badge. |

---

## Family Hub Routes

| Method | Route | What it does |
|---|---|---|
| GET | `/family/patient/:id/reminders` | Return reminders. Hub Manager sees toggles. Viewer sees read-only. |
| GET | `/family/patient/:id/calendar` | Return appointment calendar. |
| PATCH | `/family/task/:id/done` | Hub Manager marks task done. Records "Marked by [Name] (Hub Manager)". |

---

## Management Routes

| Method | Route | What it does |
|---|---|---|
| GET | `/mgmt/patients` | List all patients with plan status. |
| GET | `/mgmt/patient/:id/discharge` | Return discharge summary. |
| GET | `/mgmt/patient/:id/plan` | Return approved plan. |
| GET | `/mgmt/patient/:id/calendar` | Return patient calendar + follow-up checklist with statuses. |
| GET | `/mgmt/doctors` | List all doctors with availability + active load + overdue flags. |
| PATCH | `/mgmt/approval/:id/reassign` | Reassign overdue approval to another doctor. |

---

## Provider Map Routes

| Method | Route | What it does |
|---|---|---|
| GET | `/providers` | Return providers filtered by specialty, sorted by distance from patient lat/lng. Query params: specialty, lat, lng. |
| GET | `/providers/map` | Return all providers with lat/lng for management hospital map. |

---

## Data Model

```
Patient         — id, name, assigned_doctor_id, language, lat, lng
FamilyMember    — id, patient_id, name, phone, role, language
Doctor          — id, name, specialty, schedule, active_load
DischargeDoc    — id, patient_id, file_path, status, rejection_reason
PlanItem        — id, doc_id, type, fields (JSON), source_quote, needs_review, text_en, text_ta, text_hi
Task            — id, plan_item_id, scheduled_at, status, marked_by, marked_at
Provider        — id, name, type, specialty, address, phone, lat, lng
Approval        — id, doc_id, doctor_id, assigned_at, approved_at, reassigned_from
```

---

## Safety Rules (enforced in backend, not frontend)

- No plan item reaches patient routes before Approval row exists.
- Agent never writes a value it did not extract. Missing → needs_review = true.
- Translate step never rewrites drug name or dose. Uses template only.
- Notification text hardcoded template. No LLM in notification path.
- Provider results always include disclaimer field: "Suggested location. Please confirm before visiting."
