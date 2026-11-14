import re
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb
from pydantic import BaseModel

from app import storage
from app.auth import require_roles
from app.config import APPROVAL_WINDOW_HOURS
from app.db import get_conn
from app.schedule import TZ, build_tasks, first_follow_up, insert_tasks, tasks_for_item
from app.translate import translate_items

router = APIRouter(prefix="/doctor", tags=["doctor"])
doctor_only = require_roles("doctor")

# What a doctor may edit, per item type. source_quote is never editable.
EDITABLE = {
    "med": {"drug", "form", "dose", "frequency", "times", "duration_days", "food"},
    "appointment": {"with", "specialty", "resolved_date", "provider_name", "provider_address"},
    "test": {"name", "resolved_date"},
    "referral": {"specialty", "to", "resolved_date"},
    "care": {"category", "text"},
    "warning": {"text"},
}
TYPE_ORDER = "array_position(array['med','appointment','test','referral','care','warning'], i.type)"

# The current (latest) approval of each doc decides which doctor owns it.
LATEST_APPROVAL = """left join lateral (
    select * from approvals where doc_id = d.id order by assigned_at desc limit 1
) a on true"""


def _is_overdue(row: dict) -> bool:
    if row.get("status") != "pending_review" or row.get("approved_at") or not row.get("assigned_at"):
        return False
    window = timedelta(hours=APPROVAL_WINDOW_HOURS)
    return bool(row.get("overdue")) or datetime.now(timezone.utc) - row["assigned_at"] > window


def _current_doc(conn, patient_id: str, doctor_id: str) -> dict:
    """Latest reviewable doc for this patient, only if this doctor owns its approval."""
    doc = conn.execute(
        f"""select d.*, a.id as approval_id, a.doctor_id, a.assigned_at, a.approved_at
            from discharge_docs d {LATEST_APPROVAL}
            where d.patient_id = %s and d.status in ('pending_review', 'approved')
            order by d.uploaded_at desc limit 1""",
        (patient_id.upper(),),
    ).fetchone()
    if not doc or doc["doctor_id"] != doctor_id:
        raise HTTPException(404, "No plan for this patient")
    return doc


def _items(conn, doc_id) -> list[dict]:
    return conn.execute(
        f"select * from plan_items i where i.doc_id = %s order by {TYPE_ORDER}, i.id", (doc_id,)
    ).fetchall()


def _item_out(i: dict) -> dict:
    return {
        "id": str(i["id"]),
        "type": i["type"],
        "fields": i["fields"],
        "source_quote": i["source_quote"],
        "needs_review": i["needs_review"],
        "review_reason": i["review_reason"],
        "removed": i["removed"],
    }


@router.get("/patients")
def patients(user: dict = Depends(doctor_only), conn=Depends(get_conn)):
    rows = conn.execute(
        f"""select p.id, p.name, d.id as doc_id, d.status, d.discharge_date,
                   a.doctor_id, a.assigned_at, a.approved_at, a.overdue,
                   (select count(*) from plan_items i
                     where i.doc_id = d.id and i.needs_review and not i.removed) as needs_review_count
            from patients p
            left join lateral (
                select * from discharge_docs where patient_id = p.id order by uploaded_at desc limit 1
            ) d on true
            {LATEST_APPROVAL}
            where p.assigned_doctor_id = %(me)s or a.doctor_id = %(me)s
            order by a.assigned_at nulls last, p.id""",
        {"me": user["sub"]},
    ).fetchall()
    return [
        {
            "patient_id": r["id"],
            "name": r["name"],
            "status": r["status"] or "none",
            "discharge_date": r["discharge_date"],
            "assigned_at": r["assigned_at"],
            "approved_at": r["approved_at"],
            "needs_review_count": r["needs_review_count"] or 0,
            "overdue": _is_overdue(r),
        }
        for r in rows
    ]


@router.get("/patient/{patient_id}/discharge")
def discharge(patient_id: str, user: dict = Depends(doctor_only), conn=Depends(get_conn)):
    doc = _current_doc(conn, patient_id, user["sub"])
    return {
        "doc_id": str(doc["id"]),
        "file_type": doc["file_type"],
        "file_url": storage.signed_url(doc["file_path"]),
        "raw_text": doc["raw_text"],
        "discharge_date": doc["discharge_date"],
    }


@router.get("/patient/{patient_id}/plan")
def plan(patient_id: str, user: dict = Depends(doctor_only), conn=Depends(get_conn)):
    doc = _current_doc(conn, patient_id, user["sub"])
    items = _items(conn, doc["id"])
    return {
        "doc_id": str(doc["id"]),
        "status": doc["status"],
        "discharge_date": doc["discharge_date"],
        "approved_at": doc["approved_at"],
        "needs_review_count": sum(i["needs_review"] and not i["removed"] for i in items),
        "items": [_item_out(i) for i in items],
    }


# Only allowed type change: a care line that is really a visit ("Suture removal after 12 days").
TYPE_CHANGES = {("care", "appointment")}


class ItemPatch(BaseModel):
    type: str | None = None
    fields: dict | None = None
    removed: bool | None = None
    reviewed: bool | None = None  # "Mark reviewed": accept as-is


def _clean_fields(item_type: str, patch: dict) -> dict:
    unknown = set(patch) - EDITABLE[item_type]
    if unknown:
        raise HTTPException(422, f"Cannot edit: {', '.join(sorted(unknown))}")
    out = {}
    for key, value in patch.items():
        if key == "times":
            if not isinstance(value, list):
                raise HTTPException(422, "times must be a list like ['08:00', '20:00']")
            times = []
            for t in value:
                m = re.fullmatch(r"([01]?\d|2[0-3]):([0-5]\d)", str(t).strip())
                if not m:
                    raise HTTPException(422, f"Invalid time: {t} (use HH:MM, 24-hour)")
                times.append(f"{int(m.group(1)):02d}:{m.group(2)}")
            out[key] = sorted(set(times))
        elif key == "duration_days":
            if value in (None, ""):
                out[key] = None
            elif isinstance(value, int) and 1 <= value <= 365:
                out[key] = value
            else:
                raise HTTPException(422, "duration_days must be a whole number from 1 to 365")
        elif key == "resolved_date":
            if value in (None, ""):
                out[key] = None
            else:
                try:
                    out[key] = date.fromisoformat(str(value)).isoformat()
                except ValueError:
                    raise HTTPException(422, "resolved_date must be YYYY-MM-DD")
        else:
            text = str(value).strip() if value is not None else ""
            out[key] = text or None
    return out


def _lock_plan(conn, doc: dict, doctor_id: str) -> dict:
    """Lock this plan's current approval row. Edit, Approve and Reassign all take this lock first,
    so they run one at a time per plan (no edit slipping in mid-approve, no deadlocks). Returns the
    approval row re-read under the lock, plus the document's current status."""
    approval = conn.execute(
        "select * from approvals where id = %s for update", (doc["approval_id"],)
    ).fetchone()
    latest = conn.execute(
        "select id from approvals where doc_id = %s order by assigned_at desc limit 1", (doc["id"],)
    ).fetchone()
    if latest["id"] != approval["id"] or approval["doctor_id"] != doctor_id:
        raise HTTPException(409, "This plan was reassigned to another doctor")
    status = conn.execute("select status from discharge_docs where id = %s", (doc["id"],)).fetchone()["status"]
    return {**approval, "doc_status": status}


@router.patch("/patient/{patient_id}/plan/{item_id}")
def edit_item(patient_id: str, item_id: str, body: ItemPatch,
              user: dict = Depends(doctor_only), conn=Depends(get_conn)):
    doc = _current_doc(conn, patient_id, user["sub"])
    locked = _lock_plan(conn, doc, user["sub"])
    doc = {**doc, "status": locked["doc_status"]}  # fresh: an approve may have finished meanwhile
    item = conn.execute(
        "select * from plan_items where id::text = %s and doc_id = %s for update", (item_id, doc["id"])
    ).fetchone()
    if not item:
        raise HTTPException(404, "Plan item not found")
    before = {"type": item["type"], "fields": item["fields"], "removed": item["removed"],
              "needs_review": item["needs_review"]}

    item_type, fields = item["type"], dict(item["fields"])
    if body.type and body.type != item_type:
        if (item_type, body.type) not in TYPE_CHANGES:
            raise HTTPException(422, f"Cannot change {item_type} to {body.type}")
        item_type, fields = body.type, {"with": fields.get("text")}
    if body.fields:
        fields.update(_clean_fields(item_type, body.fields))
    removed = item["removed"] if body.removed is None else body.removed
    # Doctor looked at it: an edit, a removal or "mark reviewed" clears the flag.
    cleared = bool(body.fields) or body.reviewed is True or body.removed is True
    needs_review = False if cleared else item["needs_review"]

    item = conn.execute(
        """update plan_items set type = %s, fields = %s, removed = %s, needs_review = %s,
                  updated_at = now()
           where id = %s returning *""",
        (item_type, Jsonb(fields), removed, needs_review, item["id"]),
    ).fetchone()
    # History: the AI's original value is never lost.
    conn.execute(
        "insert into plan_item_edits (item_id, doctor_id, before, after) values (%s, %s, %s, %s)",
        (item["id"], user["sub"], Jsonb(before), Jsonb({"type": item["type"], "fields": item["fields"],
                                                       "removed": item["removed"], "needs_review": item["needs_review"]})),
    )

    if doc["status"] == "approved":  # replace this item's future reminders
        now = datetime.now(TZ)
        conn.execute(
            "delete from tasks where plan_item_id = %s and status = 'pending' and scheduled_at > %s",
            (item["id"], now),
        )
        follow_up = first_follow_up(_items(conn, doc["id"]), now.date())
        insert_tasks(conn, tasks_for_item(item, doc["discharge_date"], follow_up, now))
        translate_items(conn, [item])  # retranslate only the edited item

    return _item_out(item)


@router.post("/patient/{patient_id}/approve")
def approve(patient_id: str, user: dict = Depends(doctor_only), conn=Depends(get_conn)):
    """All-or-nothing: status, tasks and translations commit together in this request's one
    transaction, or none do. The approval row is locked, so a double tap (or a reassign racing
    this approve) waits, then sees the outcome and gets a 409 instead of creating duplicates."""
    doc = _current_doc(conn, patient_id, user["sub"])
    approval = _lock_plan(conn, doc, user["sub"])  # also rejects a plan reassigned meanwhile
    if approval["approved_at"] or approval["doc_status"] == "approved":
        raise HTTPException(409, "Plan is already approved")

    # Read the items under lock, so the tasks are built from exactly what gets approved.
    items = conn.execute(
        f"select * from plan_items i where i.doc_id = %s order by {TYPE_ORDER}, i.id for update", (doc["id"],)
    ).fetchall()
    open_items = [i for i in items if i["needs_review"] and not i["removed"]]
    if open_items:
        raise HTTPException(409, {
            "message": "Clear every Needs Review item before approving",
            "items": [{"id": str(i["id"]), "type": i["type"], "review_reason": i["review_reason"]}
                      for i in open_items],
        })

    now = datetime.now(TZ)
    rows = build_tasks(items, doc["discharge_date"], now)
    if not conn.execute(
        "update approvals set approved_at = %s where id = %s and approved_at is null returning id",
        (now, approval["id"]),
    ).fetchone():
        raise HTTPException(409, "Plan is already approved")
    conn.execute(
        "update discharge_docs set status = 'approved' where id = %s and status = 'pending_review'", (doc["id"],)
    )
    conn.execute(
        "update doctors set active_load = greatest(active_load - 1, 0) where id = %s", (user["sub"],)
    )
    insert_tasks(conn, rows)  # on conflict do nothing: never duplicates
    translate_items(conn, items)  # EN / TA / HI generated once, stored in the same transaction
    return {"status": "approved", "approved_at": now, "tasks_created": len(rows)}


@router.get("/calendar")
def calendar(user: dict = Depends(doctor_only), conn=Depends(get_conn)):
    rows = conn.execute(
        f"""select t.id, t.scheduled_at, i.fields, p.id as patient_id, p.name as patient_name
            from tasks t
            join plan_items i on i.id = t.plan_item_id
            join discharge_docs d on d.id = i.doc_id
            join patients p on p.id = d.patient_id
            {LATEST_APPROVAL}
            where a.doctor_id = %s and a.approved_at is not null
              and i.type = 'appointment' and not i.removed
            order by t.scheduled_at""",
        (user["sub"],),
    ).fetchall()
    return [
        {
            "task_id": str(r["id"]),
            "date": r["scheduled_at"].astimezone(TZ).date(),
            "patient_id": r["patient_id"],
            "patient_name": r["patient_name"],
            "with": r["fields"].get("with"),
            "specialty": r["fields"].get("specialty"),
        }
        for r in rows
    ]
