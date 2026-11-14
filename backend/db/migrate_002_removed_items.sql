-- Step 2: doctor can remove a plan item (kept for the record, never scheduled).
-- Only needed for databases created before this column was added to schema.sql.
alter table plan_items add column if not exists removed boolean not null default false;
