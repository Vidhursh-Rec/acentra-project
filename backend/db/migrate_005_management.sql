-- Step 8: management console. Safe to run twice.

-- Admin marks a doctor Available / Unavailable (leave etc.). Unavailable -> pending plans move.
alter table doctors add column if not exists available boolean not null default true;

-- Every doctor edit to a plan item, so the original AI value is never lost.
create table if not exists plan_item_edits (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references plan_items(id) on delete cascade,
  doctor_id  text not null references doctors(id),
  before     jsonb not null,   -- {type, fields, removed, needs_review} before the edit
  after      jsonb not null,
  edited_at  timestamptz not null default now()
);
create index if not exists idx_item_edits_item on plan_item_edits (item_id);
alter table plan_item_edits enable row level security;

-- Who reassigned an approval (admin id, or 'system' when a doctor went unavailable).
alter table approvals add column if not exists reassigned_by text;
