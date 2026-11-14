# CareBridge — Build Decisions

Decisions agreed before building. These override the spec files where they differ.

| Topic | Decision |
|---|---|
| Database | Supabase (Postgres). Not SQLite. |
| File storage | Supabase Storage, private bucket `discharge-docs`. |
| Family join | Instant access, no approval. First family member to join a patient becomes Hub Manager; everyone after is auto-assigned Viewer. |
| Needs Review colour | Amber (`bg-amber-100 text-amber-700`). Red is reserved for Missed and Warning Signs. |
| Web UI (management) | shadcn/ui + Tailwind, white + green tokens from `design-carebridge.md`. |
| Mobile UI | NativeWind (Tailwind classes in React Native) + hand-built components using the same tokens. `react-native-calendars` for the calendar, `react-native-maps` for the map. |
| Missed-dose alerts | Expo **push** notifications sent by the backend to every family member's device. Hardcoded template text. No LLM in this path. |
| Provider data | Kept the 70-row `Dataset/` CSV; only lat/lng re-placed near each row's real Chennai area, ≥ 0.005 apart. Output: `backend/data/providers.csv`. |
| Map bounds | Longitude lower bound widened from 80.17 to 80.10 because real Tambaram, Chromepet and Porur lie west of 80.17. |
| Warning signs (TA/HI) | Exact original English text shown, with the doctor-approved translation below it, plus emergency number 108. |
| Medication slots | Morning 06:00–11:00 · Afternoon 12:00–16:00 · Night 18:00–22:00. A dose becomes Missed when the next slot starts; the night slot uses a 4-hour window. |
| Patient location (map) | Device GPS first; fall back to the patient's seeded lat/lng if permission is denied. |
| Test documents | `backend/data/sample_summaries/` — 3 clean, missing dose, vague, conflicting, non-discharge, blurry image, plus one PDF. |
| Management login | `admins` table (not in the spec's data model) so the management role can log in via `/auth/login`. |
| Calendar entries | Appointments/tests are `tasks` rows (with `slot` null) — no separate calendar table. |
| Git | Project has its own repository inside `Acentra/`. |
| Patient ID mismatch | Upload is rejected ("This summary belongs to a different patient") if the document's patient ID or name doesn't match the uploader. |
| Removing plan items | Doctor can mark an item `removed` (kept for the record, never scheduled or shown to the patient). |
| Approval gate | Approve is refused while any non-removed item still has Needs Review. Editing, removing or "Mark reviewed" clears the flag. |
| Care → appointment | Doctor may convert a care line into an appointment (e.g. "Suture removal after 12 days"). No other type changes. |
| Ongoing medicines | No written duration → reminders run until the first follow-up appointment; 30 days if there is none. |
| Medicine duration | Counted from the discharge date ("for 5 days" after discharge on 10-Oct ends 14-Oct). Parsed by rule from the source text, not the AI. |
| Reminders created | Only future times. Appointments/tests/referrals go on the calendar at 09:00 on their date. |
| Slots | Time < 12:00 morning, < 18:00 afternoon, else night. |
| On time vs late | Marked before the slot window ends (11:00 / 16:00 / 22:00) = Completed; later = Taken late. Same-day undo allowed. |
| Map tab | Shown from Step 4 with a "coming soon" placeholder; built in Step 7. |
| Family routes | Family uses the `/patient/...` routes, scoped to their patient by their token (instead of separate `/family/...` routes). |
| Language flow | Language picker is the first screen whenever logged out; a language button sits at the top of login and patient screens. |
| Missed dose | Pending med dose becomes Missed when the next slot starts (night: +4 h). Checked every 5 min; one push per missed dose to all family members. |
| Push | Expo push via project `@vidhursh/carebridge`; verified working in Expo Go on iPhone. Fallback (no push token): in-app local notifications on open / every minute. |
| Hub Manager upload | Hub Manager can upload the discharge summary (Viewer cannot). |
| **Additional feature: pill photos** (built with Step 6) | Only the Hub Manager: **+** on today's medicine cards → photo of the pill with its strip + pill colour, shape and strip colour (fixed lists in EN/TA/HI). Optional. Shown on every dose card of that medicine; spoken by read-aloud ("White round pill, blue strip"). |
| Translation | At approval: medicines = fixed template (drug/dose as written, slot/time, food from a fixed dictionary, duration). Other items = gpt-oss-20b, rejected if any number changes, one retry for skipped items; English shown if still missing. Edits after approval retranslate that item only. |
| Read-aloud | Phone voice (expo-speech, en-IN / ta-IN / hi-IN). Medicine: name as written → appearance → slot + time → food. Plays even with the silent switch on. |
| Known limitation: Tamil voice | iPhones ship English and Hindi voices but **no Tamil voice** by default. The app detects this, reads in English, and tells the user how to add a voice (Settings › Accessibility › Spoken Content › Voices). A phone/OS limitation, not an app bug. |
| **Backend rule: Approve** | One transaction; approval row locked `FOR UPDATE`, re-checked, flipped only `WHERE approved_at IS NULL`. Second/racing approve → 409. Translation is inside the same transaction. |
| **Backend rule: tasks** | Unique `(plan_item_id, scheduled_at)`; inserts are `ON CONFLICT DO NOTHING`. |
| **Backend rule: mark-done** | Conditional update `WHERE status IN ('pending','missed')` — first write wins; Missed can still be marked (Taken late). Undo returns to Missed if already alerted. |
| **Backend rule: missed alerts** | `alerted_at` claimed atomically (`WHERE alerted_at IS NULL RETURNING`); only one server sends; never re-alerted. |
| **Backend rule: uploads** | Durable DB queue: upload → `queued`; worker every 3 s claims with `FOR UPDATE SKIP LOCKED`; Groq 429/outage → requeue with backoff 5/10/20/40 s (max 5 tries, then rejected with reason); stuck `processing` > 10 min requeued. |
| **Doctor availability** | Admin toggle on the website (`doctors.available`); weekly schedule shown for context. |
| **Unavailable → automatic redistribution** | Marking a doctor unavailable moves all their pending plans at once (one transaction) to the best available doctor: same specialty first, then lowest workload. Manual **Reassign** with suggestions also kept per pending plan. Reassign also updates the patient's assigned doctor. |
| **Edit / Approve / Reassign locking** | All three lock the plan's current approval row first (same order → no deadlocks): an edit can't slip in mid-approve, and approve vs reassign → exactly one wins (other gets 409). Verified both directions. |
| **Edit history** | `plan_item_edits` keeps before/after of every doctor edit; shown on the management patient page. |
| **Escalation** | Hourly job sets `approvals.overdue` after 12 h (latest approval per document only). |
| **Management website** | React + Vite + TypeScript, shadcn/ui (Nova preset, Inter, CareBridge tokens), react-router, Leaflet/OpenStreetMap. Same FastAPI backend + Supabase DB as the app; overview pages auto-refresh every 30 s. |
| Splash | Dark (black → charcoal), the only dark screen; pill ↔ nurse crossfade; language-first after splash (see design-carebridge.md §14). |
| Pill photo size | Resized on the phone to 1280 px JPEG (~200 KB) before upload; full camera photos (3–5 MB) timed out over Wi-Fi. |
| **Future (backlog): bulk synthetic patients** | Seed script generating 50–1,000 synthetic patients for management-console testing. |
| Patient dose reminders | Local notifications for the next 48 h of pending doses, rescheduled on open and after each toggle (added beyond spec at user's request). |
| Website primary buttons | Green-700 (#15803d) instead of the spec's black pill (user choice after the impeccable critique); white text passes AA. |
| Category colours | One hue per plan type (medicines green, appointments blue, tests violet, referrals teal, care rose) in icon chips only; status colours unchanged. Website first, mobile later. |
| Source quotes | 14 px upright (was 12 px italic) on the website for readability; spec updated. |
