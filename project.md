# Project: Hospital Discharge & Follow-up Coordinator (MVP)

## 1. Goal

Convert a synthetic hospital discharge summary into a doctor-approved, trackable follow-up plan with daily reminders and a calendar for the patient and family.

The system organizes and explains instructions. It must never diagnose, change medication, recommend treatment, or present a provider match as a guarantee.

All data is synthetic. No real patient, provider, or hospital data.

## 2. Build Principle

MVP first. Build the simplest working version of each feature. No future-use features unless listed in scope.

## 3. Users & Platforms

| Role | Platform | Can do |
|---|---|---|
| Patient | Mobile app | Upload discharge summary, view reminders/calendar, mark tasks done, choose language |
| Hub Manager (family) | Mobile app | View calendar, mark tasks done for patient, approve new family members and their roles |
| Viewer (family) | Mobile app | Read-only view of calendar and statuses |
| Doctor | App | Review AI plan sheet, edit directly, approve |
| Hospital Management | Website | Monitor doctor workload/schedule, reassign pending approvals |

Notes:
- Patient has NO chat with the AI. Patient app is a reminder app only.
- Doctor is pre-assigned to the patient before discharge.
- Doctor app is English only.

## 4. Core Flow

1. Patient uploads discharge summary (PDF or image or text).
2. Agent validates upload. If invalid, rejects with reason in patient's language.
3. Agent extracts instructions and builds a plan sheet. Every item keeps its exact source quote.
4. Plan sheet auto-routes to the assigned doctor.
5. Doctor edits directly if needed, then approves.
6. On approval: tasks, reminders, and calendar are created; translations are generated and stored.
7. Patient and family see the plan in their own chosen language.
8. Patient or Hub Manager marks tasks done. Missed tasks alert family.

Before approval, patient sees: "Plan waiting for doctor review."

## 5. Agent Pipeline

```
Validate → Extract → Verify → Safety Flag → Plan Sheet → (Doctor Approval) → Schedule → Translate
```

| Step | Type | What it does |
|---|---|---|
| Validate | AI + rules | Reject if unreadable, not a discharge summary, or missing key info. Return reason. |
| Extract | AI | Pull meds, appointments, tests, referrals, care instructions (wound, diet, rehab), dates, warning signs. Quote source text word for word. |
| Verify | Rules | Confirm each quote exists in source. Resolve relative dates ("after 2 weeks") from discharge date. |
| Safety Flag | Rules | Mark item `Needs Review` if: missing dose/frequency/date, vague text ("as needed", "adjust dose"), conflicting instructions, low confidence. |
| Plan Sheet | Code | Structured plan shown to doctor with source quotes highlighted. |
| Schedule | Code | After approval: create tasks, reminders, calendar entries. |
| Translate | AI + template | Generate English/Tamil/Hindi once at approval and store. |

### Rejection reasons (examples)
- Image too blurry to read
- Document is not a discharge summary
- Patient details missing

## 6. Task Statuses

| Status | Meaning |
|---|---|
| Pending | Not yet due or not yet done |
| Completed | Marked done on time |
| Taken late | Marked done after scheduled time |
| Missed | Not marked within the alert window |
| Needs Review | Flagged by agent for doctor attention |

Status shows who marked it: "Marked by Priya (Hub Manager)".

## 7. Medication Schedule

- Slots: Morning / Afternoon / Night, with exact times (e.g., Dolo 650 at 7:30 AM).
- Drug names and doses are never translated or paraphrased (e.g., "Dolo 650" stays "Dolo 650").

## 8. Missed Dose Alert

- If a dose is not marked before the next dose slot, alert ALL family members (Hub Managers and Viewers).
- Doctor is NOT notified for missed doses.
- Alert text only states the fact: "Morning dose of Dolo 650 (7:30 AM) not marked."
- Never say "take it now" or "take both together" (that is medical advice).
- If no next slot exists for the day, alert after a configurable window (default 4 hours).

## 9. Doctor Approval Escalation (Management)

- If the assigned doctor does not approve within a configurable window (default 12 hours), management website shows it as overdue.
- Management reassigns to another available doctor based on schedule/load.
- Reassigned doctor sees the full plan sheet with source quotes.

## 10. Family Hub

- Hospital adds the first Hub Manager at discharge (name + phone), linked to patient ID. No OTP in MVP.
- Other family members join using patient ID and request a role (Hub Manager or Viewer).
- First Hub Manager approves join requests and roles.
- Each family member has their own language setting.

## 11. Language & Read-Aloud

- Languages: English, Tamil, Hindi.
- Patient/family choose language at first login; stays fixed until changed in settings.
- Translations generated once at doctor approval and stored (no live translation). Same text every day.
- If doctor edits after approval: retranslate only edited items, replace old reminders.
- Medication text uses a fixed template built from structured fields (drug, dose, time), not free translation.
- Read-aloud in all 3 languages using device text-to-speech. Drug names and doses read as written.
- Rejection messages are shown in the patient's chosen language.

## 12. Provider Map

- Source: synthetic dataset of doctors/hospitals/labs (name, type, specialty, address, lat, lng, phone).
- Filter by required specialty first (e.g., cardiology follow-up → cardiology providers), then sort by distance.
- If the discharge summary names a specific doctor/hospital for follow-up, show that first; do not override.
- Show on map with navigation link (open in maps app).
- Label: "Suggested location. Please confirm before visiting." Never imply booking or guarantee.

## 13. Suggested Tech Stack (MVP, editable)

| Layer | Choice |
|---|---|
| Mobile app (Patient, Family, Doctor) | React Native (Expo), role-based login in one app |
| Management website | React + Vite |
| Backend | Python FastAPI |
| Database | SQLite |
| AI | LLM API for extraction, validation, translation |
| PDF/Image reading | pdfplumber + OCR for images |
| Map | react-native-maps or Leaflet/OpenStreetMap |
| Read-aloud | Device TTS (expo-speech) |
| Notifications | Expo local notifications |

## 14. Data Model (minimum)

- **Patient**: id, name, assigned_doctor_id, language
- **FamilyMember**: id, patient_id, name, phone, role (hub_manager/viewer), status (pending/approved), language
- **Doctor**: id, name, specialty, schedule, active_load
- **DischargeDoc**: id, patient_id, file, status (rejected/pending_review/approved), rejection_reason
- **PlanItem**: id, doc_id, type (med/appointment/test/referral/care/warning), fields (drug, dose, time, date, specialty...), source_quote, needs_review, text_en, text_ta, text_hi
- **Task**: id, plan_item_id, scheduled_at, status, marked_by, marked_at
- **Provider**: id, name, type, specialty, address, lat, lng, phone
- **Approval**: id, doc_id, doctor_id, assigned_at, approved_at, reassigned_from

## 15. Safety Rules (must hold everywhere)

- Nothing reaches the patient before doctor approval.
- Every plan item shows its source quote to the doctor.
- Agent never invents values. Missing info → `Needs Review`, not a guess.
- No diagnosis, no dose changes, no treatment suggestions in any text.
- Warning signs shown as written in the summary, plus emergency number.
- Provider matches labeled as suggestions only.

## 16. Synthetic Data Needed

- 5–10 synthetic discharge summaries, including messy ones: missing dose, vague instruction, conflicting meds, blurry image, non-discharge document.
- Synthetic provider dataset across Chennai area with multiple specialties.
- Synthetic doctors with schedules.

## 17. MVP Build Order

1. Upload + validation + extraction (with source quotes) + rejection
2. Doctor plan sheet: edit + approve
3. Patient reminders, calendar, statuses
4. Family hub (Hub Manager / Viewer) + missed-dose alert
5. Translation (EN/TA/HI) + read-aloud
6. Provider map (specialty → distance)
7. Management website: overdue approvals + reassignment

## 18. Out of Scope (MVP)

- OTP verification
- Hub Manager fallback/reassignment
- Management calling family on long inactivity
- Patient chat with AI
- Real SMS/calls
- Appointment booking
