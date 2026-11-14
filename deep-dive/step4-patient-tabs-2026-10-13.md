# Step 4 — Patient tabs, reminders, calendar (commit `e6d0a25`)

*Mode: compact · Level: mid*

## Overview
Approval already created task rows (Step 2). Step 4 adds the routes and screens that **show** those tasks to the patient and family, and lets them mark doses done.

## Backend changes

| File | Change | Why |
|---|---|---|
| `config.py` | `SLOT_WINDOWS` (06–11 / 12–16 / 18–22), `EMERGENCY_NUMBER` | One place for the rules; read from `.env`. |
| `schedule.py` | `on_time_deadline()` = slot end (or time + 1 h if later) | Decides Completed vs Taken late. |
| `plan_view.py` *(new)* | `approved_doc()`, `item_title()`, `task_out()` | Every patient read goes through `approved_doc()`, so unapproved plans can't leak. |
| `routes/patient.py` | `GET /patient/home`, `/reminders/today`, `/calendar` | Home: warnings (summary order) + missed count. Calendar: events + doses per day. |
| `routes/tasks.py` *(new)* | `PATCH /task/{id}/done` (`done: false` = undo) | Patient + Hub Manager only; today only; records who marked. |
| `routes/auth.py` | `PATCH /auth/language` | Server messages follow the app's language. |

## Mobile changes

| File | Change |
|---|---|
| `app/patient.tsx` → `app/patient/` | Became a 4-tab layout: Home · Reminders · Map · Settings. |
| `patient/index.tsx` | Pinned red Warning Signs + 108 call button, status banner, localized calendar. |
| `patient/reminders.tsx` | Morning/Afternoon/Night cards, toggle, status badge, "Marked by …". |
| `patient/map.tsx`, `settings.tsx` | "Coming soon" placeholder; language tiles. |
| `components/patient/UploadStatus.tsx` | The old upload/waiting screen, reused on Home before approval. |
| `components/LanguageButton.tsx`, `LanguageTiles.tsx`, `PatientHeader.tsx` | Shared pieces (language button on every tab). |
| `lib/i18n.ts`, `lib/calendarLocale.ts` | New EN/TA/HI strings; Tamil/Hindi month & day names. |
| `components/ui.tsx` | `Card alert` variant for missed doses. |
| `app/index.tsx` | Language picker shown first on every logged-out launch. |

## Key concepts
- **Gatekeeper function:** `approved_doc()` is the single check that enforces "nothing before approval". *Why:* one rule in one place is harder to forget than a check in every route.
- **Server decides status:** the phone sends only `done: true/false`; the server compares time to the slot deadline. *Why:* a phone's clock or code can't fake "on time".
- **Stable NativeWind classes:** missed cards use a `Card alert` prop instead of extra classes. *Why:* conflicting classes have unpredictable precedence in NativeWind.
- **Reused routes for family:** family uses `/patient/...` routes, scoped by the token's `patient_id`. *Alternative:* separate `/family/...` routes as in the spec; same result, more code.
