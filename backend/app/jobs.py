"""Background jobs (APScheduler).

Missed-dose check: a med dose still Pending when the next slot starts becomes Missed,
and every family member (Hub Manager + Viewer) gets a push. Night doses: after
MISSED_DOSE_WINDOW_HOURS. The doctor is never notified.
"""
import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler

from app.config import APPROVAL_WINDOW_HOURS, MISSED_CHECK_MINUTES, MISSED_DOSE_WINDOW_HOURS, QUEUE_POLL_SECONDS, SLOT_WINDOWS
from app.db import pool
from app.notify import missed_message, send_push
from app.plan_view import item_title
from app.schedule import TZ, on_time_deadline, slot_for
from app.upload_queue import process_queue

log = logging.getLogger("jobs")
NEXT_SLOT = {"morning": "afternoon", "afternoon": "night"}


def missed_at(scheduled_at: datetime, slot: str | None) -> datetime:
    local = scheduled_at.astimezone(TZ)
    s = slot or slot_for(local.time())
    nxt = NEXT_SLOT.get(s)
    if nxt:
        at = datetime.combine(local.date(), SLOT_WINDOWS[nxt][0], TZ)
    else:
        at = local + timedelta(hours=MISSED_DOSE_WINDOW_HOURS)
    return max(at, on_time_deadline(scheduled_at, slot))


def check_missed(now: datetime | None = None) -> int:
    now = now or datetime.now(TZ)
    with pool.connection() as conn:
        rows = conn.execute(
            """select t.id, t.scheduled_at, t.slot, i.fields, p.id as patient_id, p.name as patient_name
               from tasks t
               join plan_items i on i.id = t.plan_item_id
               join discharge_docs d on d.id = i.doc_id
               join patients p on p.id = d.patient_id
               where t.status = 'pending' and i.type = 'med' and not i.removed
                 and d.status = 'approved' and t.scheduled_at < %s""",
            (now,),
        ).fetchall()
        due = [r for r in rows if now >= missed_at(r["scheduled_at"], r["slot"])]

        messages = []
        for r in due:
            # One atomic statement flips Pending -> Missed AND claims the alert. With two servers
            # running this job, only one gets the row back, so each dose alerts exactly once.
            if not conn.execute(
                """update tasks set status = 'missed', alerted_at = now()
                   where id = %s and status = 'pending' and alerted_at is null returning id""",
                (r["id"],),
            ).fetchone():
                continue
            local = r["scheduled_at"].astimezone(TZ)
            slot = r["slot"] or slot_for(local.time())
            drug = item_title("med", r["fields"])
            for m in conn.execute(
                "select push_token, language from family_members where patient_id = %s and push_token is not null",
                (r["patient_id"],),
            ).fetchall():
                title, body = missed_message(m["language"], slot, drug, local.strftime("%H:%M"), r["patient_name"])
                messages.append({"to": m["push_token"], "title": title, "body": body})
        conn.commit()

    for token in send_push(messages):
        with pool.connection() as conn:
            conn.execute("update family_members set push_token = null where push_token = %s", (token,))
    if due:
        log.info("missed-dose check: %d marked missed, %d pushes", len(due), len(messages))
    return len(due)



def flag_overdue() -> int:
    """Escalation: a plan waiting longer than APPROVAL_WINDOW_HOURS with its current doctor is
    flagged overdue for the management console (only the latest approval of each document)."""
    with pool.connection() as conn:
        n = conn.execute(
            """update approvals set overdue = true
               where not overdue and approved_at is null and assigned_at < now() - make_interval(hours => %s)
                 and id in (select distinct on (doc_id) id from approvals order by doc_id, assigned_at desc)""",
            (APPROVAL_WINDOW_HOURS,),
        ).rowcount
    if n:
        log.info("escalation: %d approval(s) now overdue", n)
    return n


scheduler = BackgroundScheduler(timezone=str(TZ))
scheduler.add_job(check_missed, "interval", minutes=MISSED_CHECK_MINUTES, id="missed",
                  next_run_time=datetime.now(TZ), max_instances=1, coalesce=True)
scheduler.add_job(process_queue, "interval", seconds=QUEUE_POLL_SECONDS, id="uploads",
                  max_instances=1, coalesce=True)
scheduler.add_job(flag_overdue, "interval", hours=1, id="escalation",
                  next_run_time=datetime.now(TZ), max_instances=1, coalesce=True)
