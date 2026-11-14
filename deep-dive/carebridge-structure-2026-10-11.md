# CareBridge — File Structure & Progress (Junior Walkthrough)

*Level: junior · Mode: compact · Covers: Step 0 + Step 1 (commits `7d03066` → `9281b34`)*

---

## 1. Overview — what we are building, in one picture

**Analogy:** think of CareBridge as a careful hospital assistant.

1. The patient hands over their **discharge summary** (the paper you get when you leave hospital).
2. The assistant (an **AI**) reads it and writes a **draft to-do list**: medicines, appointments, tests, warning signs.
3. The assistant is *not trusted on its own*. Every line in the draft must point to the exact sentence it came from, and anything unclear gets a yellow sticky note: **"Needs Review"**.
4. A **doctor** checks the draft, fixes it and signs it (*approves*).
5. Only then does the patient (and family) get reminders.

> **The golden rule of the whole project:** nothing reaches the patient before a doctor approves it.

### Where we are

| Step | What | Status |
|---|---|---|
| 0 | Database design, test data, project folders | ✅ Done |
| 1 | Backend: login, upload, AI reading pipeline, rejections | ✅ Done + tested |
| 2 | Doctor: view, edit, approve plan → create reminders | ⏭ Next |
| 3–8 | Mobile app, reminders, family alerts, translation, map, management website | Later |

So far **everything is backend** (the server). There are no screens yet — that's why `mobile/` and `management/` only contain a settings template.

---

## 2. The file structure, explained

```
Acentra/
├── project.md, frontend.md, backend.md,      ← THE SPEC: what to build (written by you)
│   dataset.md, design-carebridge.md
├── DECISIONS.md                              ← answers we agreed on where specs disagreed
├── .gitignore                                ← list of files Git must NEVER save (secrets!)
├── Dataset/                                  ← your original 70-row provider CSV (untouched)
│
├── backend/                                  ← the server (Python + FastAPI)
│   ├── .env            (not in Git)          ← your real passwords/keys
│   ├── .env.example                          ← the same file with blanks, safe to share
│   ├── .venv/          (not in Git)          ← installed Python packages
│   ├── requirements.txt                      ← shopping list of Python packages
│   │
│   ├── db/                                   ← database setup scripts (run in Supabase)
│   │   ├── schema.sql                        ← creates the tables (the "shape" of the data)
│   │   ├── seed.sql                          ← fake doctors, admin, 6 patients
│   │   └── seed_providers.sql                ← 70 fake clinics/doctors/labs for the map
│   │
│   ├── data/
│   │   ├── providers.csv                     ← providers with fixed Chennai coordinates
│   │   └── sample_summaries/                 ← 9 fake test documents (good + broken ones)
│   │
│   └── app/                                  ← THE ACTUAL SERVER CODE
│       ├── main.py          ← front door: starts the app, plugs in the routes
│       ├── config.py        ← reads settings from .env
│       ├── db.py            ← talks to the database (Supabase Postgres)
│       ├── storage.py       ← saves uploaded files (Supabase Storage)
│       ├── auth.py          ← makes and checks login tokens (JWT)
│       ├── messages.py      ← fixed rejection messages in English/Tamil/Hindi
│       │
│       ├── routes/          ← the URLs the app can call
│       │   ├── auth.py      ← POST /auth/login, POST /auth/family/join
│       │   └── patient.py   ← POST /patient/upload, GET /patient/status, GET /patient/rejection
│       │
│       └── pipeline/        ← the "AI assistant" assembly line
│           ├── run.py       ← the manager: runs every station in order
│           ├── reader.py    ← station 1: file → plain text (PDF reader / OCR)
│           ├── validate.py  ← station 2: is this a discharge summary for THIS patient?
│           ├── extract.py   ← station 3: AI pulls out the to-do items + exact quotes
│           ├── verify.py    ← station 4: rules double-check the AI's work
│           ├── safety.py    ← station 5: rules stick "Needs Review" notes
│           ├── llm.py       ← helper: how we call Groq (the AI service)
│           └── text.py      ← helper: tidy text so comparisons are fair
│
├── mobile/.env.example                       ← placeholder until Step 3 (Expo app)
└── management/.env.example                   ← placeholder until Step 8 (website)
```

**Why split code into so many small files?** Each file has *one job*. If the AI starts inventing dates, you know to look in `verify.py`, not in a 2,000-line file. This is called **separation of concerns**.

---

## 3. Follow one upload through the code (the most important section)

Let's trace what happens when patient **P1001** uploads `01_clean_cardiac.pdf`.

```
Phone ──POST /patient/upload──▶ routes/patient.py
                                   │ 1. check token (auth.py)
                                   │ 2. check file type & size
                                   │ 3. save file      → storage.py → Supabase Storage
                                   │ 4. save a row     → discharge_docs (status = 'processing')
                                   │ 5. reply "202 Accepted" immediately
                                   ▼
                     background task: pipeline/run.py
                                   │ reader.py   → text
                                   │ validate.py → right patient? discharge summary?
                                   │ extract.py  → AI draft items with quotes
                                   │ verify.py   → quotes real? dates worked out
                                   │ safety.py   → "Needs Review" notes
                                   ▼
            plan_items rows + approvals row (doctor D102) + status = 'pending_review'
```

If anything fails at a station, the document is **rejected** with a reason code (e.g. `UNREADABLE`) and the patient later sees the message in their language.

### Why reply "202" before the AI finishes?
The AI can take 10–30 seconds. If the phone waited, it might time out. So we say *"Got it, working on it"* (HTTP **202 Accepted**) and do the heavy work in a **background task**. The app later asks `GET /patient/status` to see the result.

```python
# routes/patient.py (simplified)
conn.commit()  # save the row FIRST — the background job needs to find it
background.add_task(run_pipeline, doc_id, patient_id, data, file_type)  # run later
return {"doc_id": doc_id, "status": "processing"}   # answer the phone now
```

---

## 4. Key components (one line each)

| File | Main function(s) | What it does |
|---|---|---|
| `main.py` | `lifespan`, `app` | Opens the DB connection pool on start, closes it on stop, registers routes. |
| `config.py` | `_required()` | Crashes early with a clear message if a setting like `GROQ_API_KEY` is missing. |
| `db.py` | `pool`, `get_conn()` | Keeps up to 5 open DB connections to reuse; gives one to each request. |
| `storage.py` | `upload()`, `download()` | Sends files to Supabase Storage over HTTP. |
| `auth.py` | `make_token()`, `require_roles()` | Issues login tokens; blocks users whose role isn't allowed on a route. |
| `routes/auth.py` | `login()`, `family_join()` | Patient (ID+name), doctor/admin (ID+password), family join (first = Hub Manager). |
| `routes/patient.py` | `upload()`, `status()`, `rejection()` | Upload a file; return status only (never plan content); return translated rejection. |
| `pipeline/reader.py` | `read_text()`, `_ocr()` | PDF → text with pdfplumber; image → text with Tesseract; too blurry → `Unreadable`. |
| `pipeline/validate.py` | `validate()` | AI reads name/ID/date; **code** decides accept/reject. |
| `pipeline/extract.py` | `extract()` | AI returns JSON items, each with a word-for-word `source_quote`. |
| `pipeline/verify.py` | `verify()`, `_resolve_date()` | Checks every quote/value is really in the document; turns "after 2 weeks" into a date. |
| `pipeline/safety.py` | `flag()`, `drug_key()` | Flags missing dose/time/date, vague words, duplicate drugs, "STOP drug" conflicts. |
| `pipeline/run.py` | `run_pipeline()` | Runs the stations in order; saves the plan and routes it to the doctor. |
| `messages.py` | `message()` | Pre-written EN/TA/HI texts — no AI, so the wording is always the same. |

---

## 5. Concepts explained (what + why)

### 5.1 "Trust but verify" — AI reads, rules decide
**What:** The AI (Groq `gpt-oss-120b`) is good at *reading* messy text but can *invent* things ("hallucinate"). So after the AI answers, plain Python rules check its work.

**Why:** In medicine a made-up dose is dangerous. A rule like *"the dose must literally appear in the quoted sentence"* can't hallucinate.

```python
# verify.py — if the AI's dose isn't in the quote, throw it away and flag it
value = fields.get("dose")
if value and norm(value) not in quote:
    fields["dose"] = None                                  # never keep an invented value
    item["reasons"].append("Dose not found in source quote")  # tell the doctor
```

**Real example from our test:** the AI once created a warning sign called *"Emergency contact"*, a phrase not in the document. The new rule in `verify.py` now catches this kind of invented text.

**Alternative:** trust the AI fully (faster to build, unsafe) or don't use AI at all (safe but can't handle messy real-world documents).

### 5.2 Rules that don't depend on the AI
**What:** `safety.py` scans the **whole original document** for lines like *"STOP Aspirin"*, even if the AI forgot to extract that line.

**Why:** In test 06 the AI skipped the "STOP Aspirin" advice line. If our conflict check only looked at AI output, the conflict would have been missed. Now it's caught directly from the source.

```python
# safety.py — "stop" but NOT "do not stop"   (?<!not ) means "not preceded by 'not '"
STOP = re.compile(r"(?<!not )(?<!n't )\b(stop|hold|discontinue)\b", re.IGNORECASE)
```

### 5.3 JWT login tokens
**What:** After login, the server gives the app a **token**, a signed text string containing `{"role": "patient", "patient_id": "P1001", ...}`. The app sends it with every request.

**Analogy:** a wristband at a concert. The guard (`require_roles`) checks the wristband colour; no need to look you up again.

**Why:** The server doesn't have to remember who is logged in. The signature (made with `JWT_SECRET`) means nobody can edit the wristband to say `"role": "doctor"`.

```python
@router.post("/upload")
def upload(..., user = Depends(require_roles("patient"))):  # only patients may upload
```

### 5.4 Environment variables & `.gitignore`
**What:** Secrets (DB password, Groq key) live in `backend/.env`. `.gitignore` tells Git never to save it. `.env.example` is the same file with blanks so others know what to fill in.

**Why:** If secrets are committed to Git, anyone who sees the repo can use your database. (That's also why we put `.env.example` back after it was renamed.)

### 5.5 Database tables & relationships (`schema.sql`)
**What:** Tables are like spreadsheets. `references` links them:

```
patients ──< discharge_docs ──< plan_items ──< tasks
   │              └──< approvals >── doctors
   └──< family_members
```
(`──<` = "one has many")

Two clever rules live **inside the database**, so no code bug can break them:

```sql
-- Only ONE hub manager per patient: the DB itself refuses a second one
create unique index one_hub_manager_per_patient
  on family_members (patient_id) where role = 'hub_manager';

-- status can only be one of these words; a typo like 'aproved' is rejected
check (status in ('processing','rejected','pending_review','approved'))
```

`family_join()` *tries* to insert a Hub Manager; if the DB says "unique violation", it inserts a Viewer instead. The **savepoint** (`with conn.transaction():`) lets us undo just that failed insert without cancelling everything else.

### 5.6 Row Level Security (RLS)
**What:** `alter table ... enable row level security` with no rules = *the public Supabase key can read nothing*.

**Why:** Only our backend (using the private connection) touches data. Even if someone finds the public key, patient data stays locked. Safety enforced in the backend, not the phone.

### 5.7 Connection pool
**What:** Opening a DB connection is slow (~100 ms+). `db.py` keeps a few open and lends them out.

**Analogy:** a shared bike rack instead of buying a new bike for every trip.

**Gotcha we hit:** Supabase's pooler (port 6543) can't handle "prepared statements", hence `prepare_threshold=None`. And when the password was wrong, the pool kept retrying, so Supabase temporarily blocked us ("circuit breaker").

### 5.8 OCR (Optical Character Recognition)
**What:** Tesseract turns a photo of text into text, and also tells us how *confident* it is per word.

**Why the confidence matters:** a blurry photo gives garbage text. Instead of feeding garbage to the AI, `reader.py` rejects it if average confidence < 60 or fewer than 30 words → `UNREADABLE`.

### 5.9 Fixed templates instead of AI for patient messages
`messages.py` holds hand-written Tamil/Hindi text. **Why not let the AI translate rejections live?** Same input → always the same, reviewed wording; no risk of the AI adding advice. The spec applies this to notifications too ("No LLM in notification path").

### 5.10 Already-known concepts (skipped)
- **REST APIs**: our routes (`POST /patient/upload`, etc.) are standard REST endpoints.
- **async/await**: only used in `main.py`'s `lifespan`; routes are normal functions run in a thread pool.

---

## 6. Test data: why the "broken" files exist

| File | Tests that… | Result |
|---|---|---|
| 01–03 | clean summaries pass with few flags | pending_review ✅ |
| 04 | missing dose/time → Needs Review | Montelukast, Ascoril flagged ✅ |
| 05 | vague words ("as needed", "soon") → Needs Review | all 4 caught ✅ |
| 06 | conflicts (Amlodipine twice, STOP Aspirin) → Needs Review | caught ✅ |
| 07 | pharmacy bill → reject | NOT_DISCHARGE ✅ |
| 08 | blurry photo → reject | UNREADABLE ✅ |
| 02 uploaded by P1001 | wrong patient → reject | PATIENT_MISMATCH ✅ |

**Lesson:** you design tests for the *bad* cases on purpose. A system that only works on perfect input isn't safe.

---

## 7. Glossary

| Term | Meaning |
|---|---|
| **Backend** | The server program; phones/websites talk to it. |
| **FastAPI** | Python library for building the backend's URLs (routes). |
| **Supabase** | Hosted Postgres database + file storage. |
| **Groq** | Service that runs the AI models fast. |
| **LLM** | Large Language Model, the AI that reads text. |
| **Pipeline** | A series of steps where each output feeds the next. |
| **Source quote** | The exact sentence from the document an item came from. |
| **Needs Review** | Flag telling the doctor "check this one". |
| **Seed data** | Fake starter data so the app can be tested. |
| **Commit** | A saved snapshot in Git. |

---

*Other files in scope, one line each:* `requirements.txt` lists exact package versions so installs are repeatable · `providers.csv` / `seed_providers.sql` hold the map data (coordinates fixed to real areas) · `DECISIONS.md` records every choice where the specs disagreed.

Want more? Ask for **"/antivibe full"** on a single folder (e.g. `backend/app/pipeline/`) for a line-by-line walkthrough with learning resources.

## Step 2: the doctor reviews and approves

What we'll build: six backend routes, still no screens.

Route	What it does
GET /doctor/patients	Lists the doctor's patients, with a red "overdue" flag after 12 hours
GET …/discharge	Returns the original document text, for the left side of the split screen
GET …/plan	Returns the AI's draft items, each with its source quote and Needs Review note
PATCH …/plan/:item_id	Lets the doctor fix one item, such as adding a missing dose
POST …/approve	Locks the plan and creates the reminders
GET /doctor/calendar	Shows the doctor's appointments

Why approval is the key moment: until the doctor approves, the patient gets nothing. Approving does three things:

Records who approved and when.
Turns each medicine time into a daily reminder task, sorted into morning, afternoon and night.
Adds appointments and tests to the calendar.

Safety rules (the "why"):

A doctor can only open their own patients' plans.
Approval is refused while any item still has a Needs Review flag, so a missing dose can't slip through.
When a doctor edits an item, it's checked again, and that check never fills in a value by guessing.

Analogy: the AI drafts the to-do list, the doctor signs it, and the signature unlocks the reminders.

Test: log in as each doctor, fix the flagged items, approve, and confirm the reminders were created.