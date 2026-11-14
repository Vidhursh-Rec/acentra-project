# Deep dive: backend runtime, scheduler and the 12-hour escalation (2026-10-19)

Mode: compact · Level: mid

## Overview

- Backend = **FastAPI** (`backend/app/main.py`, `app = FastAPI(title="CareBridge API", lifespan=lifespan)`), served by
  uvicorn, Postgres on Supabase via a psycopg connection pool.
- Background work = **APScheduler `BackgroundScheduler`** started inside the FastAPI process (`lifespan` →
  `scheduler.start()`), not a separate script, cron job or worker service. It runs on threads in the same process
  as the API.
- The 12-hour rule **flags**, it does not reroute. Rerouting happens only when an admin presses Reassign or turns a
  doctor's availability off.

## Key components

| Piece | File | What it does |
|---|---|---|
| `lifespan` | `main.py` | Starts the scheduler when the API boots, stops it on shutdown |
| `scheduler` | `jobs.py:94` | One `BackgroundScheduler` (Asia/Kolkata TZ) with 3 interval jobs |
| `check_missed` | `jobs.py` | Every 5 min: Pending dose past its slot → Missed + family push (atomic `alerted_at` claim) |
| `process_queue` | `upload_queue.py` | Every 3 s: claims queued uploads with `FOR UPDATE SKIP LOCKED`, runs the pipeline |
| `flag_overdue` | `jobs.py:79` | Every hour (and once at boot): sets `approvals.overdue = true` on the latest approval of each doc still unapproved after `APPROVAL_WINDOW_HOURS` (default 12, env-overridable) |
| `_is_overdue` | `routes/doctor.py:35` | Read-time check: overdue if the flag is set **or** `now - assigned_at > 12 h`, so screens are exact even between hourly runs |
| `reassign` | `reassign.py` | Moves a plan to another doctor; locks the same approval row Approve locks |
| availability PATCH | `routes/mgmt.py` | Doctor marked unavailable → all their pending plans auto-move to the best available doctor (same specialty first, then lowest load) |

## The 12-hour flow, end to end

1. Plan routed to doctor → `approvals` row with `assigned_at`.
2. Hourly `flag_overdue` marks it `overdue` once 12 h pass (persisted, so it survives restarts and counts are cheap).
3. Website shows red Overdue badge / "Needs you now" panel (via `_is_overdue`).
4. **Human decides**: admin clicks Reassign, or switches the doctor off → server reassigns inside one locked
   transaction. A reassignment writes a new approval row with a fresh `assigned_at`, so the 12 h clock restarts
   (why Sunil's count dropped to 0 after your move).

## Concepts

- **In-process scheduler (APScheduler).** What: timer-driven Python functions inside the web process. Why: zero extra
  infrastructure for an MVP; shares config and DB pool. Trade-off: run two API instances and every job runs twice.
  The code already survives that (atomic `alerted_at` claim, `SKIP LOCKED` queue, idempotent `overdue` update), but
  it is duplicated work. Alternatives: one dedicated worker process, OS cron / Supabase `pg_cron`, or a queue
  (Celery/RQ) when scale demands it.
- **`max_instances=1, coalesce=True`.** Stops a slow run overlapping the next one, and collapses missed runs (e.g.
  laptop asleep) into one catch-up run instead of a burst.
- **Persisted flag + read-time check.** Hourly flag = durable state for counts and history; read-time check = exact
  answer at any minute. Belt and braces, cheap.
- **Flag, don't auto-move.** Matches the decision you made in Step 8: only *unavailability* triggers automatic
  redistribution. A busy-but-present doctor is escalated to a human, not silently overridden.

## If you wanted automatic rerouting after 12 h

Small change: inside `flag_overdue`, for each newly overdue approval call `reassign(conn, doc_id, None, by="system")`
(it already picks the best available doctor and records `reassigned_by`). It is a policy decision, not a technical
one: it would move clinical responsibility without an admin seeing it first. Not built; spec says escalate.
