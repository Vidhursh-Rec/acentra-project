# Frontend Spec — CareBridge MVP

## 1. Platforms

| App | Users | Platform |
|---|---|---|
| Patient & Family Hub | Patient, Hub Manager, Viewer | React Native (Expo) — one app, role-based view |
| Doctor App | Doctor | React Native (Expo) — same app, doctor role |
| Management Console | Hospital Admin | React + Vite (website) |

---

## 2. Patient & Family Hub — Mobile App

### Screen 1 — Splash / Language Picker
- App name and logo.
- Language selector: English / தமிழ் / हिंदी.
- Language saved to device; persists until changed in Settings.

### Screen 2 — Login
- Patient ID + name. No password in MVP.
- Family member: enter patient ID → pick role (Hub Manager or Viewer).
- Role rule: only 1 Hub Manager allowed per patient. If taken → assigned Viewer automatically.
- No approval wait. Instant access on role pick.

### Screen 3 — Upload
- Upload button: PDF, image, or text.
- After upload → show "Plan waiting for doctor review" screen.
- Patient sees no plan content until doctor approves.
- If upload rejected by agent → show rejection reason in patient's chosen language.

### Screen 4 — Home Tab (default after approval)
- **Pinned Warning Signs card** — always visible at top. Shows exact warning text from discharge summary + emergency contact number. Never hidden.
- **Status banner** — always visible: "Waiting for doctor" / "Plan active" / "X tasks missed".
- **Big calendar** — appointments only shown as dots/events. Tap date → see what is due.

### Screen 5 — Daily Reminder Tab
- Sections: Morning / Afternoon / Night.
- Each med/task shown as a card with:
  - Drug name + dose (never translated, e.g., "Dolo 650").
  - Scheduled time.
  - Toggle to mark done.
  - Read-aloud button — reads med name + time in chosen language using device TTS.
- Status per card: Pending / Completed / Taken Late / Missed.
- Missed = red highlight.
- Status shows who marked: "Marked by Priya (Hub Manager)".

### Screen 6 — Map Tab
- Map auto-filtered by patient's conditions extracted from discharge summary.
- Shows nearest specialists + hospitals as pins.
- Tap pin → name, phone, address, "Open in Maps" button (native navigation).
- Label on every result: "Suggested location. Please confirm before visiting."
- If discharge summary names a specific provider → shown first, pinned.

### Screen 7 — Settings
- Change language only.
- One screen, minimal.

---

## 3. Family Hub — Same App, Role-Based View

### Hub Manager view
- All 6 screens same as patient.
- Can toggle task done on reminder cards.
- Receives missed-dose push notification.

### Viewer view
- Calendar + reminders visible, read-only.
- No toggle.
- Receives missed-dose push notification.

### Missed-dose notification
- Text only: "Morning dose of Dolo 650 (7:30 AM) not marked."
- Never says "take it now" or "take both together".

---

## 4. Doctor App — Mobile App (same Expo app, doctor role)

### Screen 1 — Login
- Doctor ID + password.
- English only. No language picker.

### Screen 2 — Patient List
- List of assigned patients.
- Overdue badge (red) on patient card if approval pending too long.

### Screen 3 — Plan Approval (split view)
- Left panel: original discharge summary (PDF/image/text rendered as-is).
- Right panel: AI-generated plan sheet.
  - Source quote highlighted per item.
  - Needs Review items flagged red.
  - Inline edit on any item.
- Approve button at bottom. Approval locks plan and triggers patient reminders + calendar.

### Screen 4 — Doctor's Own Calendar
- Appointments added per patient approved.
- Doctor's schedule view only.

### Screen 5 — Overdue Badge
- Shown on patient list cards.
- Red if approval window exceeded (default 12 hours).

---

## 5. Management Console — Website (React + Vite)

### Screen 1 — Patient List
- List of all patients.
- Click patient → detail view:
  - Left: discharge summary.
  - Right: doctor-approved plan.
  - Below: patient calendar (appointments) + follow-up checklist with statuses.

### Screen 2 — Doctor Management
- List of all doctors with availability status.
- Overdue approvals flagged.
- Reassign / rotate doctor button per pending approval.

### Screen 3 — Hospital Map
- All providers (doctors, hospitals, labs) on map.
- Filter by specialty.
- Used for coverage monitoring and reassignment context.

---

## 6. Global UI Rules

- Drug names and doses never translated in any screen.
- Warning signs always shown in original text + emergency number.
- Provider suggestions always labeled: "Suggested location. Please confirm before visiting."
- Nothing shown to patient before doctor approval.
- Read-aloud: device TTS, all 3 languages, drug names read as written.
- Status always shows who marked: "Marked by [Name] ([Role])".
