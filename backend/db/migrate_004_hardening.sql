-- Reliability hardening (testing.md): no duplicate tasks, one alert per missed dose,
-- and a durable upload queue with retry + backoff. Safe to run twice.

-- 1. One task per medicine per time: a double Approve can't create duplicates.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_item_time_key') then
    alter table tasks add constraint tasks_item_time_key unique (plan_item_id, scheduled_at);
  end if;
end $$;

-- 2. Missed-dose alert sent at most once, even with two servers running the job.
alter table tasks add column if not exists alerted_at timestamptz;
update tasks set alerted_at = now() where status = 'missed' and alerted_at is null;  -- already handled

-- 3. Upload queue: 'queued' -> 'processing' -> 'pending_review' / 'rejected'.
alter table discharge_docs drop constraint if exists discharge_docs_status_check;
alter table discharge_docs add constraint discharge_docs_status_check
  check (status in ('queued', 'processing', 'rejected', 'pending_review', 'approved'));
alter table discharge_docs alter column status set default 'queued';
alter table discharge_docs add column if not exists attempts        int not null default 0;
alter table discharge_docs add column if not exists next_attempt_at timestamptz;
alter table discharge_docs add column if not exists claimed_at      timestamptz;  -- worker heartbeat
alter table discharge_docs add column if not exists last_error      text;
create index if not exists idx_docs_queue on discharge_docs (status, next_attempt_at);
