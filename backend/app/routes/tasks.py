from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import require_roles
from app.db import get_conn
from app.plan_view import TASK_SELECT, tasks_out
from app.schedule import TZ, on_time_deadline

router = APIRouter(tags=["tasks"])


class DoneIn(BaseModel):
    done: bool = True  # False = undo (same day only)


@router.patch("/task/{task_id}/done")
def mark_done(task_id: str, body: DoneIn,
              user: dict = Depends(require_roles("patient", "hub_manager")), conn=Depends(get_conn)):
    """Patient or Hub Manager toggles a task. Viewers are read-only."""
    task = conn.execute(
        """select t.*, d.patient_id, d.status as doc_status, d.id as doc_id
           from tasks t join plan_items i on i.id = t.plan_item_id
           join discharge_docs d on d.id = i.doc_id
           where t.id::text = %s and not i.removed""",
        (task_id,),
    ).fetchone()
    if not task or task["patient_id"] != user["patient_id"] or task["doc_status"] != "approved":
        raise HTTPException(404, "Task not found")

    now = datetime.now(TZ)
    if task["scheduled_at"].astimezone(TZ).date() != now.date():
        raise HTTPException(409, "Only today's reminders can be changed")

    # Conditional updates: the database decides who wins. If the patient and Hub Manager tap at
    # the same instant, only the first update matches; the other changes nothing and gets back
    # the winning record (one marked_by / marked_at, status never flips).
    if body.done:
        status = "completed" if now <= on_time_deadline(task["scheduled_at"], task["slot"]) else "taken_late"
        conn.execute(
            """update tasks set status = %s, marked_by = %s, marked_by_role = %s, marked_at = %s
               where id = %s and status in ('pending', 'missed')""",  # Missed can still be marked: Taken late
            (status, user["name"], user["role"], now, task["id"]),
        )
    else:
        # Undo returns to Missed if the family was already alerted (the job won't alert twice).
        conn.execute(
            """update tasks set status = case when alerted_at is not null then 'missed' else 'pending' end,
                      marked_by = null, marked_by_role = null, marked_at = null
               where id = %s and status in ('completed', 'taken_late')""",
            (task["id"],),
        )

    row = conn.execute(f"{TASK_SELECT} and t.id = %s", (task["doc_id"], task["id"])).fetchone()
    return tasks_out([row])[0]
