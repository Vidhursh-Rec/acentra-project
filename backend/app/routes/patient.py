import uuid
from datetime import datetime, time, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app import storage
from app.auth import require_roles
from app.config import EMERGENCY_NUMBER, MAX_UPLOAD_MB
from app.db import get_conn
from app.messages import message
from app.notify import missed_message
from app.plan_view import TASK_SELECT, approved_doc, task_out, tasks_out
from app.schedule import TZ

router = APIRouter(prefix="/patient", tags=["patient"])

_EXT_TYPES = {
    ".pdf": ("pdf", "application/pdf"),
    ".png": ("image", "image/png"),
    ".jpg": ("image", "image/jpeg"),
    ".jpeg": ("image", "image/jpeg"),
    ".txt": ("text", "text/plain; charset=utf-8"),
}


def _latest_doc(conn, patient_id: str):
    return conn.execute(
        "select * from discharge_docs where patient_id = %s order by uploaded_at desc limit 1",
        (patient_id,),
    ).fetchone()


def _language(conn, user: dict) -> str:
    if user["role"] == "patient":
        row = conn.execute("select language from patients where id = %s", (user["sub"],)).fetchone()
    else:
        row = conn.execute("select language from family_members where id = %s", (user["sub"],)).fetchone()
    return row["language"] if row else "en"


def _error(status: int, code: str, language: str):
    raise HTTPException(status, {"code": code, "message": message(code, language)})


@router.post("/upload", status_code=202)
def upload(
    file: UploadFile | None = File(None),
    text: str | None = Form(None),
    user: dict = Depends(require_roles("patient", "hub_manager")),  # Hub Manager may upload for the patient
    conn=Depends(get_conn),
):
    patient_id = user["patient_id"]
    language = _language(conn, user)

    latest = _latest_doc(conn, patient_id)
    if latest and latest["status"] != "rejected":
        _error(409, "ALREADY_UPLOADED", language)

    if file is not None:
        ext = Path(file.filename or "").suffix.lower()
        if ext not in _EXT_TYPES:
            _error(400, "UNSUPPORTED_FILE", language)
        file_type, content_type = _EXT_TYPES[ext]
        data = file.file.read(MAX_UPLOAD_MB * 1024 * 1024 + 1)
    elif text and text.strip():
        ext, (file_type, content_type) = ".txt", _EXT_TYPES[".txt"]
        data = text.encode("utf-8")
    else:
        _error(400, "UNSUPPORTED_FILE", language)

    if not data or len(data) > MAX_UPLOAD_MB * 1024 * 1024:
        _error(400, "UNSUPPORTED_FILE", language)

    doc_id = str(uuid.uuid4())
    path = f"{patient_id}/{doc_id}{ext}"
    storage.upload(path, data, content_type)
    conn.execute(
        "insert into discharge_docs (id, patient_id, file_path, file_type) values (%s, %s, %s, %s)",
        (doc_id, patient_id, path, file_type),
    )

    # Queued, not processed here: the upload worker picks it up within seconds (app/upload_queue.py).
    return {"doc_id": doc_id, "status": "queued"}


@router.get("/status")
def status(
    user: dict = Depends(require_roles("patient", "hub_manager", "viewer")),
    conn=Depends(get_conn),
):
    """Status only — never plan content."""
    doc = _latest_doc(conn, user["patient_id"])
    if not doc:
        return {"status": "none"}
    return {"status": doc["status"], "doc_id": str(doc["id"]), "uploaded_at": doc["uploaded_at"]}


@router.get("/home")
def home(user: dict = Depends(require_roles("patient", "hub_manager", "viewer")), conn=Depends(get_conn)):
    """Home tab: status banner + pinned warning signs (approved plans only)."""
    latest = _latest_doc(conn, user["patient_id"])
    doc = approved_doc(conn, user["patient_id"])
    out = {"status": latest["status"] if latest else "none", "emergency_number": EMERGENCY_NUMBER,
           "warnings": [], "missed_count": 0}
    if not doc:
        return out
    out["warnings"] = [
        {"id": str(r["id"]), "text": r["fields"].get("text") or r["source_quote"],
         "text_ta": r["text_ta"], "text_hi": r["text_hi"]}
        for r in conn.execute(
            # same order as in the discharge summary
            """select * from plan_items where doc_id = %s and type = 'warning' and not removed
               order by strpos(%s, source_quote), id""",
            (doc["id"], doc["raw_text"] or ""),
        ).fetchall()
    ]
    out["missed_count"] = conn.execute(
        f"select count(*) as n from ({TASK_SELECT}) x where x.status = 'missed'", (doc["id"],)
    ).fetchone()["n"]
    return out


@router.get("/reminders/today")
def reminders_today(user: dict = Depends(require_roles("patient", "hub_manager", "viewer")), conn=Depends(get_conn)):
    """Today's tasks; the app groups them Morning / Afternoon / Night."""
    today = datetime.now(TZ).date()
    out = {"date": today.isoformat(), "can_mark": user["role"] in ("patient", "hub_manager"),
           "can_add_photo": user["role"] == "hub_manager", "tasks": []}
    doc = approved_doc(conn, user["patient_id"])
    if not doc:
        return out
    start = datetime.combine(today, time(0), TZ)
    rows = conn.execute(
        f"{TASK_SELECT} and t.scheduled_at >= %s and t.scheduled_at < %s order by t.scheduled_at",
        (doc["id"], start, start + timedelta(days=1)),
    ).fetchall()
    out["tasks"] = tasks_out(rows)
    return out


@router.get("/calendar")
def calendar(user: dict = Depends(require_roles("patient", "hub_manager", "viewer")), conn=Depends(get_conn)):
    """Appointments / tests / referrals as events, plus how many doses fall on each day."""
    doc = approved_doc(conn, user["patient_id"])
    if not doc:
        return {"events": [], "doses_per_day": {}}
    rows = conn.execute(f"{TASK_SELECT} order by t.scheduled_at", (doc["id"],)).fetchall()
    events, doses = [], {}
    for r, t in zip(rows, tasks_out(rows)):
        if r["type"] == "med":
            doses[t["date"]] = doses.get(t["date"], 0) + 1
        else:
            events.append(t)
    return {"events": events, "doses_per_day": doses}


@router.get("/missed")
def missed(user: dict = Depends(require_roles("patient", "hub_manager", "viewer")), conn=Depends(get_conn)):
    """Missed doses of the last 2 days, with the same fixed alert text as the push.
    The app uses this for in-app alerts when push isn't available on the device."""
    doc = approved_doc(conn, user["patient_id"])
    if not doc:
        return []
    language = _language(conn, user)
    patient = conn.execute("select name from patients where id = %s", (user["patient_id"],)).fetchone()
    rows = conn.execute(
        f"{TASK_SELECT} and t.status = 'missed' and i.type = 'med' and t.scheduled_at > %s order by t.scheduled_at desc",
        (doc["id"], datetime.now(TZ) - timedelta(days=2)),
    ).fetchall()
    out = []
    for r in rows:
        t = task_out(r)
        title, body = missed_message(language, t["slot"], t["title"], t["time"], patient["name"])
        out.append({"id": t["id"], "title": title, "body": body})
    return out


@router.get("/upcoming")
def upcoming(user: dict = Depends(require_roles("patient")), conn=Depends(get_conn)):
    """Next 48 h of pending doses, for reminders the patient's phone schedules itself."""
    doc = approved_doc(conn, user["patient_id"])
    if not doc:
        return []
    now = datetime.now(TZ)
    rows = conn.execute(
        f"""{TASK_SELECT} and t.status = 'pending' and i.type = 'med'
            and t.scheduled_at > %s and t.scheduled_at < %s order by t.scheduled_at""",
        (doc["id"], now, now + timedelta(hours=48)),
    ).fetchall()
    return [{**task_out(r), "at": r["scheduled_at"].isoformat()} for r in rows]


@router.get("/rejection")
def rejection(
    user: dict = Depends(require_roles("patient", "hub_manager", "viewer")),
    conn=Depends(get_conn),
):
    doc = _latest_doc(conn, user["patient_id"])
    if not doc or doc["status"] != "rejected":
        raise HTTPException(404, "No rejected upload")
    language = _language(conn, user)
    return {
        "code": doc["rejection_reason"],
        "message": message(doc["rejection_reason"], language),
        "language": language,
    }
