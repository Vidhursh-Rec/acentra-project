import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from psycopg.errors import UniqueViolation
from pydantic import BaseModel

from app.auth import check_password, make_token, require_roles
from app.db import get_conn
from app.pipeline.text import name_key

router = APIRouter(prefix="/auth", tags=["auth"])

Language = Literal["en", "ta", "hi"]


class LoginIn(BaseModel):
    role: Literal["patient", "doctor", "management"]
    id: str
    name: str | None = None        # patient
    password: str | None = None    # doctor / management
    language: Language | None = None  # patient: from splash picker


@router.post("/login")
def login(body: LoginIn, conn=Depends(get_conn)):
    uid = body.id.strip().upper()

    if body.role == "patient":
        p = conn.execute("select * from patients where id = %s", (uid,)).fetchone()
        if not p or not body.name or name_key(body.name) != name_key(p["name"]):
            raise HTTPException(401, "Invalid patient ID or name")
        language = body.language or p["language"]
        if body.language and body.language != p["language"]:
            conn.execute("update patients set language = %s where id = %s", (language, uid))
        claims = {"sub": uid, "role": "patient", "name": p["name"], "patient_id": uid, "language": language}

    elif body.role == "doctor":
        d = conn.execute("select * from doctors where id = %s", (uid,)).fetchone()
        if not d or not body.password or not check_password(body.password, d["password_hash"]):
            raise HTTPException(401, "Invalid doctor ID or password")
        claims = {"sub": uid, "role": "doctor", "name": d["name"], "language": "en"}

    else:
        a = conn.execute("select * from admins where id = %s", (uid,)).fetchone()
        if not a or not body.password or not check_password(body.password, a["password_hash"]):
            raise HTTPException(401, "Invalid admin ID or password")
        claims = {"sub": uid, "role": "management", "name": a["name"], "language": "en"}

    return {"token": make_token(claims), **{k: v for k, v in claims.items() if k != "sub"}, "id": uid}


class LanguageIn(BaseModel):
    language: Language


@router.patch("/language")
def set_language(body: LanguageIn, user: dict = Depends(require_roles("patient", "hub_manager", "viewer")),
                 conn=Depends(get_conn)):
    """Patient / family changed language in the app. Messages are sent in this language."""
    if user["role"] == "patient":
        conn.execute("update patients set language = %s where id = %s", (body.language, user["sub"]))
    else:
        conn.execute("update family_members set language = %s where id = %s", (body.language, user["sub"]))
    return {"language": body.language}


class PushTokenIn(BaseModel):
    token: str | None  # None = this device can't receive push (app falls back to in-app alerts)


@router.patch("/push-token")
def set_push_token(body: PushTokenIn, user: dict = Depends(require_roles("hub_manager", "viewer")),
                   conn=Depends(get_conn)):
    """Family member's Expo push token, used for missed-dose alerts."""
    token = body.token if body.token and body.token.startswith("ExponentPushToken[") else None
    conn.execute("update family_members set push_token = %s where id = %s", (token, user["sub"]))
    return {"push": bool(token)}


class JoinIn(BaseModel):
    patient_id: str
    name: str
    phone: str
    role: Literal["hub_manager", "viewer"]
    language: Language | None = None  # missing -> English


@router.post("/family/join")
def family_join(body: JoinIn, conn=Depends(get_conn)):
    """Instant access. First family member becomes Hub Manager; if taken -> Viewer.
    Joining again with the same phone logs the member back in."""
    pid = body.patient_id.strip().upper()
    phone = re.sub(r"\D", "", body.phone)
    name = body.name.strip()
    if not name or len(phone) < 10:
        raise HTTPException(422, "Name and a valid phone number are required")
    if not conn.execute("select 1 from patients where id = %s", (pid,)).fetchone():
        raise HTTPException(404, "Patient ID not found")

    member = conn.execute(
        "select * from family_members where patient_id = %s and phone = %s", (pid, phone)
    ).fetchone()
    language = body.language or (member["language"] if member else "en")
    if member:
        if member["language"] != language:
            conn.execute("update family_members set language = %s where id = %s", (language, member["id"]))
    else:
        insert = """insert into family_members (patient_id, name, phone, role, language)
                    values (%s, %s, %s, %s, %s) returning *"""
        if body.role == "hub_manager":
            try:
                with conn.transaction():  # savepoint: unique index allows one hub manager
                    member = conn.execute(insert, (pid, name, phone, "hub_manager", language)).fetchone()
            except UniqueViolation:
                member = None
        if not member:
            member = conn.execute(insert, (pid, name, phone, "viewer", language)).fetchone()

    claims = {
        "sub": str(member["id"]),
        "role": member["role"],
        "name": member["name"],
        "patient_id": pid,
        "language": language,
    }
    return {
        "token": make_token(claims),
        "id": str(member["id"]),
        "role": member["role"],
        "requested_role": body.role,
        "name": member["name"],
        "patient_id": pid,
        "language": language,
    }
