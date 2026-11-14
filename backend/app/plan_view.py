"""Read helpers for patient & family screens. Only an APPROVED plan is ever returned."""
from app import storage
from app.med_text import drug_label, food_i18n
from app.schedule import TZ, slot_for


def approved_doc(conn, patient_id: str) -> dict | None:
    """The patient's latest discharge doc, only if the doctor has approved it."""
    doc = conn.execute(
        "select * from discharge_docs where patient_id = %s order by uploaded_at desc limit 1", (patient_id,)
    ).fetchone()
    return doc if doc and doc["status"] == "approved" else None


def item_title(item_type: str, f: dict) -> str:
    """Drug name and dose exactly as written. Never translated."""
    if item_type == "med":
        return drug_label(f)
    if item_type == "appointment":
        return f.get("with") or f.get("specialty") or ""
    if item_type == "test":
        return f.get("name") or ""
    if item_type == "referral":
        return " · ".join(v for v in (f.get("specialty"), f.get("to")) if v)
    return f.get("text") or ""


def task_out(r: dict, photo_urls: dict | None = None) -> dict:
    """r = tasks row joined with plan_items (see TASK_SELECT)."""
    local = r["scheduled_at"].astimezone(TZ)
    is_med = r["type"] == "med"
    out = {
        "id": str(r["id"]),
        "item_id": str(r["plan_item_id"]),
        "type": r["type"],
        "title": item_title(r["type"], r["fields"]),
        # Translations made at approval; app falls back to English when ta/hi is empty.
        "text": {"en": r.get("text_en"), "ta": r.get("text_ta"), "hi": r.get("text_hi")},
        "food": food_i18n(r["fields"].get("food")) if is_med else None,
        "date": local.date().isoformat(),
        "time": local.strftime("%H:%M"),
        "slot": r["slot"] or slot_for(local.time()),
        "status": r["status"],
        "marked_by": r["marked_by"],
        "marked_by_role": r["marked_by_role"],
        "marked_at": r["marked_at"],
        "pill": None,
    }
    if is_med and (r.get("pill_photo_path") or r.get("pill_color") or r.get("strip_color")):
        out["pill"] = {
            "photo_url": (photo_urls or {}).get(r.get("pill_photo_path")),
            "pill_color": r.get("pill_color"),
            "pill_shape": r.get("pill_shape"),
            "strip_color": r.get("strip_color"),
            "added_by": r.get("pill_added_by"),
        }
    return out


def tasks_out(rows: list[dict]) -> list[dict]:
    """task_out for many rows, signing all pill photo links in one Storage call."""
    paths = sorted({r["pill_photo_path"] for r in rows if r.get("pill_photo_path")})
    urls = storage.signed_urls(paths) if paths else {}
    return [task_out(r, urls) for r in rows]


TASK_SELECT = """select t.*, i.type, i.fields, i.text_en, i.text_ta, i.text_hi,
                        i.pill_photo_path, i.pill_color, i.pill_shape, i.strip_color, i.pill_added_by
                 from tasks t join plan_items i on i.id = t.plan_item_id
                 where i.doc_id = %s and not i.removed"""
