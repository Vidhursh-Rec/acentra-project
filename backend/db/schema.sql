-- CareBridge MVP schema (Supabase / Postgres)
-- Run order: schema.sql -> seed.sql -> seed_providers.sql  (Supabase SQL Editor)
-- All data is synthetic.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- People
-- ---------------------------------------------------------------

create table if not exists doctors (
  id             text primary key,                 -- e.g. D101
  name           text not null,
  specialty      text not null,
  password_hash  text not null,                    -- bcrypt
  schedule       jsonb not null default '{}',      -- {"mon": ["09:00","17:00"], ...}
  active_load    int  not null default 0,          -- pending approvals assigned
  available      boolean not null default true     -- admin toggle; unavailable -> pending plans move
);

create table if not exists admins (
  id             text primary key,                 -- management console login
  name           text not null,
  password_hash  text not null
);

create table if not exists patients (
  id                  text primary key,            -- e.g. P1001 (used for login)
  name                text not null,
  assigned_doctor_id  text not null references doctors(id),
  language            text not null default 'en' check (language in ('en','ta','hi')),
  lat                 double precision,            -- fallback when GPS denied
  lng                 double precision,
  created_at          timestamptz not null default now()
);

create table if not exists family_members (
  id          uuid primary key default gen_random_uuid(),
  patient_id  text not null references patients(id) on delete cascade,
  name        text not null,
  phone       text not null,
  role        text not null check (role in ('hub_manager','viewer')),
  language    text not null default 'en' check (language in ('en','ta','hi')),
  push_token  text,                                -- Expo push token
  created_at  timestamptz not null default now()
);

-- Only one Hub Manager per patient. Join route assigns viewer when taken.
create unique index if not exists one_hub_manager_per_patient
  on family_members (patient_id) where role = 'hub_manager';

-- ---------------------------------------------------------------
-- Discharge document + plan
-- ---------------------------------------------------------------

create table if not exists discharge_docs (
  id                uuid primary key default gen_random_uuid(),
  patient_id        text not null references patients(id) on delete cascade,
  file_path         text not null,                 -- Supabase Storage path
  file_type         text not null check (file_type in ('pdf','image','text')),
  raw_text          text,                          -- extracted text (verify step + doctor view)
  discharge_date    date,
  status            text not null default 'queued'
                    check (status in ('queued','processing','rejected','pending_review','approved')),
  rejection_reason  text,
  attempts          int not null default 0,          -- upload queue: tries so far
  next_attempt_at   timestamptz,                     -- retry with exponential backoff
  claimed_at        timestamptz,                     -- worker heartbeat (stuck jobs are requeued)
  last_error        text,
  uploaded_at       timestamptz not null default now()
);

create table if not exists plan_items (
  id             uuid primary key default gen_random_uuid(),
  doc_id         uuid not null references discharge_docs(id) on delete cascade,
  type           text not null check (type in ('med','appointment','test','referral','care','warning')),
  fields         jsonb not null default '{}',      -- drug, dose, time, date, specialty, ...
  source_quote   text not null,                    -- exact words from summary
  needs_review   boolean not null default false,
  review_reason  text,                             -- e.g. "Dose or frequency missing"
  removed        boolean not null default false,   -- doctor removed it; kept for the record, never scheduled
  pill_photo_path text,                            -- Hub Manager's photo of the strip (meds only)
  pill_color     text,
  pill_shape     text,
  strip_color    text,
  pill_added_by  text,
  pill_added_at  timestamptz,
  text_en        text,
  text_ta        text,
  text_hi        text,
  updated_at     timestamptz not null default now(),
  translated_at  timestamptz                       -- retranslate when updated_at > translated_at
);

create table if not exists approvals (
  id               uuid primary key default gen_random_uuid(),
  doc_id           uuid not null references discharge_docs(id) on delete cascade,
  doctor_id        text not null references doctors(id),
  assigned_at      timestamptz not null default now(),
  approved_at      timestamptz,
  reassigned_from  text references doctors(id),
  reassigned_by    text,                          -- admin id, or 'system' (doctor went unavailable)
  overdue          boolean not null default false  -- set by escalation cron
);

create table if not exists plan_item_edits (    -- doctor edits; the AI original is never lost
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references plan_items(id) on delete cascade,
  doctor_id  text not null references doctors(id),
  before     jsonb not null,
  after      jsonb not null,
  edited_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Tasks (reminders + calendar appointments)
-- ---------------------------------------------------------------

create table if not exists tasks (
  id              uuid primary key default gen_random_uuid(),
  plan_item_id    uuid not null references plan_items(id) on delete cascade,
  scheduled_at    timestamptz not null,
  slot            text check (slot in ('morning','afternoon','night')),  -- null for appointments/tests
  status          text not null default 'pending'
                  check (status in ('pending','completed','taken_late','missed')),
  marked_by       text,                            -- name, e.g. "Priya"
  marked_by_role  text check (marked_by_role in ('patient','hub_manager')),
  marked_at       timestamptz,
  alerted_at      timestamptz,                     -- missed-dose alert sent (set once, atomically)
  unique (plan_item_id, scheduled_at)              -- double Approve can't duplicate tasks
);

-- ---------------------------------------------------------------
-- Provider map
-- ---------------------------------------------------------------

create table if not exists providers (
  id         int primary key,
  name       text not null,
  type       text not null check (type in ('individual_doctor','hospital','lab')),
  specialty  text not null,
  address    text not null,
  phone      text not null,
  lat        double precision not null,
  lng        double precision not null
);

-- ---------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------

create index if not exists idx_docs_patient      on discharge_docs (patient_id);
create index if not exists idx_docs_queue        on discharge_docs (status, next_attempt_at);
create index if not exists idx_items_doc         on plan_items (doc_id);
create index if not exists idx_tasks_item        on tasks (plan_item_id);
create index if not exists idx_tasks_scheduled   on tasks (scheduled_at);
create index if not exists idx_approvals_doctor  on approvals (doctor_id);
create index if not exists idx_providers_spec    on providers (specialty);

-- ---------------------------------------------------------------
-- Security: only the backend (service role / direct DB) touches data.
-- RLS on with no policies = anon/public keys can read nothing.
-- ---------------------------------------------------------------

alter table doctors         enable row level security;
alter table admins          enable row level security;
alter table patients        enable row level security;
alter table family_members  enable row level security;
alter table discharge_docs  enable row level security;
alter table plan_items      enable row level security;
alter table approvals       enable row level security;
alter table tasks           enable row level security;
alter table providers       enable row level security;
alter table plan_item_edits enable row level security;

-- ---------------------------------------------------------------
-- Storage bucket for uploaded discharge summaries (private)
-- ---------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('discharge-docs', 'discharge-docs', false)
on conflict (id) do nothing;
