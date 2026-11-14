"""Additional feature: Hub Manager photographs a medicine strip and picks its colours,
so the patient can recognise the pill. Optional; only for meds in an approved plan."""
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app import storage
from app.auth import require_roles
from app.config import MAX_UPLOAD_MB
from app.db import get_conn
from app.plan_view import approved_doc

router = APIRouter(tags=["pills"])

PILL_COLORS = {"white", "yellow", "orange", "pink", "red", "blue", "green", "brown", "purple"}
STRIP_COLORS = {"silver", "gold", "white", "blue", "green", "red", "orange", "pink", "purple", "clear"}
SHAPES = {"round", "oval", "capsule"}
PHOTO_TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}


def _choice(value: str | None, allowed: set[str], name: str) -> str | None:
    if value in (None, ""):
        return None
    if value not in allowed:
        raise HTTPException(422, f"Unknown {name}: {value}")
    return value


@router.put("/patient/med/{item_id}/pill")
def set_pill(
    item_id: str,
    file: UploadFile | None = File(None),
    pill_color: str | None = Form(None),
    pill_shape: str | None = Form(None),
    strip_color: str | None = Form(None),
    user: dict = Depends(require_roles("hub_manager")),
    conn=Depends(get_conn),
):
    doc = approved_doc(conn, user["patient_id"])
    item = doc and conn.execute(
        "select * from plan_items where id::text = %s and doc_id = %s and type = 'med' and not removed",
        (item_id, doc["id"]),
    ).fetchone()
    if not item:
        raise HTTPException(404, "Medicine not found")

    colors = (
        _choice(pill_color, PILL_COLORS, "pill colour"),
        _choice(pill_shape, SHAPES, "shape"),
        _choice(strip_color, STRIP_COLORS, "strip colour"),
    )
    path = item["pill_photo_path"]
    if file is not None:
        ext = Path(file.filename or "").suffix.lower()
        if ext not in PHOTO_TYPES:
            raise HTTPException(400, "Please choose a JPG or PNG photo")
        data = file.file.read(MAX_UPLOAD_MB * 1024 * 1024 + 1)
        if not data or len(data) > MAX_UPLOAD_MB * 1024 * 1024:
            raise HTTPException(400, f"Photo must be under {MAX_UPLOAD_MB} MB")
        path = f"{user['patient_id']}/pills/{item['id']}{ext}"
        storage.upload(path, data, PHOTO_TYPES[ext])
    elif not any(colors):
        raise HTTPException(422, "Add a photo or choose colours")

    conn.execute(
        """update plan_items set pill_photo_path = %s, pill_color = %s, pill_shape = %s, strip_color = %s,
                  pill_added_by = %s, pill_added_at = now()
           where id = %s""",
        (path, *colors, user["name"], item["id"]),
    )
    return {
        "photo_url": storage.signed_urls([path]).get(path) if path else None,
        "pill_color": colors[0], "pill_shape": colors[1], "strip_color": colors[2],
        "added_by": user["name"],
    }
