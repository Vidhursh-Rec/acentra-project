"""Management console (hospital admin). Read everything; change only availability and assignment."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app import storage
from app.auth import require_roles
from app.db import get_conn
from app.plan_view import TASK_SELECT, tasks_out
from app.reassign import reassign, suggestions
from app.routes.doctor import TYPE_ORDER, _is_overdue

router = APIRouter(prefix="/mgmt", tags=["management"])
admin_only = require_roles("management")

LATEST_DOC = """left join lateral (
    select * from discharge_docs where patient_id = p.id order by uploaded_at desc limit 1) d on true"""
LATEST_APPROVAL = """left join lateral (
    select * from approvals where doc_id = d.id order by assigned_at desc limit 1) a on true"""


def _latest_doc(conn, patient_id: str) -> dict:
    doc = conn.execute(
        "select * from discharge_docs where patient_id = %s order by uploaded_at desc limit 1", (patient_id.upper(),)
    ).fetchone()
    if not doc:
        raise HTTPException(404, "No discharge summary for this patient")
    return doc


@router.get("/patients")
def patients(user: dict = Depends(admin_only), conn=Depends(get_conn)):
    rows = conn.execute(
        f"""select p.id, p.name, p.language, d.id as doc_id, d.status, d.discharge_date, d.uploaded_at,
                   a.doctor_id, a.assigned_at, a.approved_at, a.overdue, doc.name as doctor_name,
                   (select count(*) from family_members f where f.patient_id = p.id) as family,
                   (select count(*) from tasks t join plan_items i on i.id = t.plan_item_id
                     where i.doc_id = d.id and t.status = 'missed') as missed
            from patients p {LATEST_DOC} {LATEST_APPROVAL}
            left join doctors doc on doc.id = coalesce(a.doctor_id, p.assigned_doctor_id)
            order by p.id"""
    ).fetchall()
    return [{
        "patient_id": r["id"], "name": r["name"], "language": r["language"],
        "status": r["status"] or "none", "discharge_date": r["discharge_date"], "uploaded_at": r["uploaded_at"],
        "doctor_id": r["doctor_id"], "doctor_name": r["doctor_name"], "approved_at": r["approved_at"],
        "overdue": _is_overdue(r), "family": r["family"], "missed": r["missed"],
    } for r in rows]


@router.get("/patient/{patient_id}")
def profile(patient_id: str, user: dict = Depends(admin_only), conn=Depends(get_conn)):
    """Header card: who the patient is, their doctor and their family hub."""
    p = conn.execute(
        """select p.*, d.name as doctor_name, d.specialty as doctor_specialty
           from patients p join doctors d on d.id = p.assigned_doctor_id where p.id = %s""",
        (patient_id.upper(),),
    ).fetchone()
    if not p:
        raise HTTPException(404, "Patient not found")
    family = conn.execute(
        """select name, role, language, push_token is not null as push from family_members
           where patient_id = %s order by role, created_at""",
        (p["id"],),
    ).fetchall()
    return {"patient_id": p["id"], "name": p["name"], "language": p["language"],
            "doctor": {"id": p["assigned_doctor_id"], "name": p["doctor_name"], "specialty": p["doctor_specialty"]},
            "family": family}


@router.get("/patient/{patient_id}/discharge")
def discharge(patient_id: str, user: dict = Depends(admin_only), conn=Depends(get_conn)):
    doc = _latest_doc(conn, patient_id)
    return {"doc_id": str(doc["id"]), "status": doc["status"], "file_type": doc["file_type"],
            "file_url": storage.signed_url(doc["file_path"]), "raw_text": doc["raw_text"],
            "discharge_date": doc["discharge_date"], "rejection_reason": doc["rejection_reason"]}


@router.get("/patient/{patient_id}/plan")
def plan(patient_id: str, user: dict = Depends(admin_only), conn=Depends(get_conn)):
    """The plan (approved, or still waiting) with each item's edit history."""
    doc = _latest_doc(conn, patient_id)
    items = conn.execute(
        f"select * from plan_items i where i.doc_id = %s order by {TYPE_ORDER}, i.id", (doc["id"],)
    ).fetchall()
    edits = conn.execute(
        """select e.*, dr.name as doctor_name from plan_item_edits e join doctors dr on dr.id = e.doctor_id
           where e.item_id in (select id from plan_items where doc_id = %s) order by e.edited_at""",
        (doc["id"],),
    ).fetchall()
    history: dict[str, list] = {}
    for e in edits:
        history.setdefault(str(e["item_id"]), []).append({
            "doctor": e["doctor_name"], "at": e["edited_at"], "before": e["before"], "after": e["after"]})
    approvals = conn.execute(
        """select a.*, dr.name as doctor_name from approvals a join doctors dr on dr.id = a.doctor_id
           where a.doc_id = %s order by a.assigned_at""", (doc["id"],)
    ).fetchall()
    return {
        "doc_id": str(doc["id"]), "status": doc["status"],
        "items": [{"id": str(i["id"]), "type": i["type"], "fields": i["fields"], "source_quote": i["source_quote"],
                   "needs_review": i["needs_review"], "review_reason": i["review_reason"], "removed": i["removed"],
                   "text": {"en": i["text_en"], "ta": i["text_ta"], "hi": i["text_hi"]},
                   "history": history.get(str(i["id"]), [])} for i in items],
        "approvals": [{"doctor": a["doctor_name"], "doctor_id": a["doctor_id"], "assigned_at": a["assigned_at"],
                       "approved_at": a["approved_at"], "reassigned_from": a["reassigned_from"],
                       "reassigned_by": a["reassigned_by"]} for a in approvals],
    }


@router.get("/patient/{patient_id}/calendar")
def calendar(patient_id: str, user: dict = Depends(admin_only), conn=Depends(get_conn)):
    """Appointments + follow-up checklist with statuses and who marked them."""
    doc = _latest_doc(conn, patient_id)
    if doc["status"] != "approved":
        return {"events": [], "tasks": []}
    rows = conn.execute(f"{TASK_SELECT} order by t.scheduled_at", (doc["id"],)).fetchall()
    tasks = tasks_out(rows)
    return {"events": [t for t in tasks if t["type"] != "med"], "tasks": tasks}


@router.get("/doctors")
def doctors(user: dict = Depends(admin_only), conn=Depends(get_conn)):
    docs = conn.execute("select id, name, specialty, schedule, active_load, available from doctors order by id").fetchall()
    pending = conn.execute(
        f"""select a.id as approval_id, a.doctor_id, a.assigned_at, a.approved_at, a.overdue, d.status,
                   p.id as patient_id, p.name as patient_name
            from patients p {LATEST_DOC} {LATEST_APPROVAL}
            where d.status = 'pending_review' and a.approved_at is null order by a.assigned_at"""
    ).fetchall()
    by_doctor: dict[str, list] = {}
    for r in pending:
        by_doctor.setdefault(r["doctor_id"], []).append({
            "approval_id": str(r["approval_id"]), "patient_id": r["patient_id"], "patient_name": r["patient_name"],
            "assigned_at": r["assigned_at"], "overdue": _is_overdue(r)})
    approved_7d = {r["doctor_id"]: r["n"] for r in conn.execute(
        """select doctor_id, count(*) as n from approvals
           where approved_at > now() - interval '7 days' group by doctor_id""").fetchall()}
    patients = {r["assigned_doctor_id"]: r["n"] for r in conn.execute(
        "select assigned_doctor_id, count(*) as n from patients group by assigned_doctor_id").fetchall()}
    return [{**d, "pending": by_doctor.get(d["id"], []),
             "overdue_count": sum(x["overdue"] for x in by_doctor.get(d["id"], [])),
             "approved_7d": approved_7d.get(d["id"], 0), "patients": patients.get(d["id"], 0)} for d in docs]


@router.get("/approval/{approval_id}/suggestions")
def approval_suggestions(approval_id: str, user: dict = Depends(admin_only), conn=Depends(get_conn)):
    a = conn.execute(
        "select a.doctor_id, dr.specialty from approvals a join doctors dr on dr.id = a.doctor_id where a.id::text = %s",
        (approval_id,),
    ).fetchone()
    if not a:
        raise HTTPException(404, "Approval not found")
    return suggestions(conn, a["doctor_id"], a["specialty"])


class ReassignIn(BaseModel):
    doctor_id: str | None = None  # empty = best suggestion


@router.patch("/approval/{approval_id}/reassign")
def reassign_approval(approval_id: str, body: ReassignIn, user: dict = Depends(admin_only), conn=Depends(get_conn)):
    a = conn.execute("select doc_id from approvals where id::text = %s", (approval_id,)).fetchone()
    if not a:
        raise HTTPException(404, "Approval not found")
    return reassign(conn, a["doc_id"], body.doctor_id, by=user["sub"])


class AvailabilityIn(BaseModel):
    available: bool


@router.patch("/doctors/{doctor_id}/availability")
def set_availability(doctor_id: str, body: AvailabilityIn, user: dict = Depends(admin_only), conn=Depends(get_conn)):
    """Unavailable -> every pending plan of this doctor moves automatically to the best available
    doctor (same specialty first, then lowest workload). One transaction: all move, or none."""
    did = doctor_id.upper()
    if not conn.execute("update doctors set available = %s where id = %s returning id", (body.available, did)).fetchone():
        raise HTTPException(404, "Doctor not found")
    moved, stuck = [], []
    if not body.available:
        docs = conn.execute(
            """select d.id from discharge_docs d
               join lateral (select * from approvals where doc_id = d.id order by assigned_at desc limit 1) a on true
               where d.status = 'pending_review' and a.approved_at is null and a.doctor_id = %s
               order by a.assigned_at""",
            (did,),
        ).fetchall()
        for d in docs:
            try:
                moved.append(reassign(conn, d["id"], None, by="system"))
            except HTTPException as e:  # e.g. no available doctor left: stays, admin sees it
                stuck.append({"doc_id": str(d["id"]), "reason": e.detail})
    return {"doctor_id": did, "available": body.available, "moved": moved, "not_moved": stuck}
