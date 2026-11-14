# Testing Spec — CareBridge Reliability

## Goal

Prove CareBridge stays correct and safe under concurrent use, before going online. Every test has a pass rule and a number to report.

All data is synthetic. Free tools only.

## Build Principle

MVP. Four tests only. No extra tooling.

---

## 1. Synthetic Seed Data

Script: `backend/tests/seed.py`. Idempotent (safe to run twice).

| Entity | Count | Notes |
|---|---|---|
| Doctors | 8 | Mixed specialties, varied active_load, 2 marked unavailable |
| Patients | 50 | Spread across doctors, language mix EN/TA/HI |
| Family members | ~120 | Exactly 1 Hub Manager per patient, rest Viewers |
| Discharge docs | 50 | Mix below |
| Tasks | ~1000 | Mix of Pending / Completed / Taken late / Missed / Needs Review |

Discharge doc mix: 60% clean, 15% missing dose, 10% vague instruction, 5% conflicting meds, 5% blurry image (rejected), 5% non-discharge file (rejected).

---

## 2. Test 1 — Concurrent Mark Done

**Risk:** Hub Manager and patient both toggle the same dose at the same moment. Duplicate rows, wrong "marked by", wrong status.

**How:** 50 parallel requests to `PATCH /task/:id/done` on the same task, from different users.

**Pass:**
- Exactly one `marked_by` / `marked_at` recorded (first write wins).
- Status is correct (Completed or Taken late) and never flips.
- Zero 500 errors.

**Fix pattern:** conditional update (`WHERE status = 'Pending'`) or row lock.

---

## 3. Test 2 — Double Approve (Idempotency + Transaction)

**Risk:** Doctor double-taps Approve, or management reassigns while the doctor approves. Duplicate tasks, half-saved plan.

**How:**
- Fire Approve twice at the same instant.
- Fire Approve and Reassign at the same instant.
- Kill the translate step midway and check the state.

**Pass:**
- Task count equals plan item count. No duplicates.
- Approve is all-or-nothing: status, tasks, translations commit together, or none do.
- If both Approve and Reassign race, exactly one wins; the other gets a clear conflict response.
- Patient never sees a partial plan.

**Fix pattern:** DB transaction + unique constraint on (plan_item_id, scheduled_at) + status check inside the transaction.

---

## 4. Test 3 — Groq Throttle (Queue + Backoff)

**Risk:** Free tier rate limit hits during many uploads. Documents lost or stuck.

**How:** Upload 50 documents within 1 minute (Locust). Mock a 429 response from Groq on some calls.

**Pass:**
- Zero documents lost. Every upload ends as `pending_review` or `rejected` with a reason.
- Retries use exponential backoff.
- Upload endpoint responds fast (queued), does not wait on Groq.
- Patient sees "Plan waiting for doctor review" while queued, never an error screen.

**Fix pattern:** background job queue, status column (`queued` / `processing`), retry with backoff.

---

## 5. Test 4 — Two Instances, One Scheduler

**Risk:** Run 2 FastAPI instances (horizontal scaling). APScheduler runs in both, so family gets every missed-dose alert twice.

**How:**
- Run 2 instances locally behind nginx (round-robin).
- Seed 20 overdue doses.
- Let the cron fire.

**Pass:**
- Each missed dose creates exactly one alert per family member.
- No dose skipped.
- Alert text stays the fixed template. No medical advice.

**Fix pattern:** DB-level lock (advisory lock or `alerted_at` flag set atomically) so only one instance sends.

---

## 6. Latency Report

Measured with Locust on key reads, at 50 concurrent users.

| Endpoint | Report |
|---|---|
| `GET /patient/reminders/today` | p50 / p95 / p99 |
| `GET /doctor/patient/:id/plan` | p50 / p95 / p99 |
| `GET /providers` | p50 / p95 / p99 |

Index check: run `EXPLAIN ANALYZE` on tasks by (scheduled_at, status) and providers by specialty, before and after adding indexes. Report the time difference.

Target (editable): p95 under 500 ms on reads.

---

## 7. Results Table (fill after running)

| Test | Before fix | After fix | Pass |
|---|---|---|---|
| Concurrent mark done | | | |
| Double approve | | | |
| Groq throttle | | | |
| Two-instance scheduler | | | |

---

## 8. Tools

| Tool | Use |
|---|---|
| Locust | Load generation (Python) |
| pytest + asyncio | Race condition tests |
| nginx (local) | 2-instance setup |
| Supabase `EXPLAIN ANALYZE` | Index proof |

---

## 9. Pitch Summary

- **Concurrency:** one dose, many hands, one correct record.
- **Idempotency + ACID:** approval is all-or-nothing, never duplicated.
- **Backpressure:** bursts of uploads are queued, never lost.
- **Horizontal scaling:** more servers do not mean more duplicate alerts.
- **Latency:** p95 numbers reported with indexes proven.

## 10. Out of Scope

- Real traffic load balancing and autoscaling
- Multi-region and database replication
- Security and penetration testing
- Chaos testing beyond the cases above
