"""Provider map (Step 7). Suggestions only: every result carries the disclaimer.

Filter by specialty first, then sort by distance. Specialties come from the APPROVED plan
(follow-up appointments, referrals, and labs implied by tests) via a fixed keyword table.
A doctor/hospital named in the summary is shown first and never overridden.
"""
import re

from fastapi import APIRouter, Depends, Query

from app.auth import require_roles
from app.db import get_conn
from app.plan_view import approved_doc

router = APIRouter(tags=["providers"])

DISCLAIMER = "Suggested location. Please confirm before visiting."

# keyword in plan text -> provider specialty (exact names in the providers table)
SPECIALTY_KEYWORDS = [
    (r"cardio|heart|\becg\b|echo", "Cardiology"),
    (r"ortho|fracture|bone", "Orthopedics"),
    (r"neuro|stroke", "Neurology"),
    (r"derma|skin", "Dermatology"),
    (r"ophthal|\beye", "Ophthalmology"),
    (r"\bent\b|ear|nose|throat", "ENT"),
    (r"gastro|stomach|endoscop", "Gastroenterology"),
    (r"endocrin|diabet", "Endocrinology (Diabetes)"),
    (r"nephro|kidney|renal", "Nephrology"),
    (r"pulmo|lung", "Pulmonology"),
    (r"psych", "Psychiatry"),
    (r"general medicine|physician", "General Medicine"),
]
LAB_KEYWORDS = [
    (r"x-?ray|scan|ultrasound|\bmri\b|\bct\b", "Radiology"),
    (r"blood|sugar|\bhb\b|haemoglobin|hemoglobin|lipid|hba1c|creatinine|electrolyte|urine|culture|fbs|ppbs",
     "Pathology"),
]

DISTANCE_SQL = """6371 * 2 * asin(sqrt(
    power(sin(radians(lat - %(lat)s) / 2), 2) +
    cos(radians(%(lat)s)) * cos(radians(lat)) * power(sin(radians(lng - %(lng)s) / 2), 2)))"""


def _match(text: str, table) -> str | None:
    text = text.casefold()
    for pattern, specialty in table:
        if re.search(pattern, text):
            return specialty
    return None


def _provider_out(r: dict) -> dict:
    return {
        "id": r["id"], "name": r["name"], "type": r["type"], "specialty": r["specialty"],
        "address": r["address"], "phone": r["phone"], "lat": r["lat"], "lng": r["lng"],
        "distance_km": round(r["distance_km"], 1) if r.get("distance_km") is not None else None,
        "disclaimer": DISCLAIMER,
    }


@router.get("/patient/map")
def patient_map(user: dict = Depends(require_roles("patient", "hub_manager", "viewer")), conn=Depends(get_conn)):
    """Map context: preset specialties, providers named in the summary, saved home location."""
    patient = conn.execute("select lat, lng from patients where id = %s", (user["patient_id"],)).fetchone()
    out = {"specialties": [], "named": [], "home": {"lat": patient["lat"], "lng": patient["lng"]},
           "disclaimer": DISCLAIMER}
    doc = approved_doc(conn, user["patient_id"])
    if not doc:
        return out  # nothing from the plan before approval

    specialties, names = [], []
    for i in conn.execute(
        """select type, fields from plan_items
           where doc_id = %s and not removed and type in ('appointment', 'referral', 'test')""",
        (doc["id"],),
    ).fetchall():
        f = i["fields"]
        text = " ".join(str(f.get(k) or "") for k in ("specialty", "with", "name", "to"))
        found = _match(text, LAB_KEYWORDS if i["type"] == "test" else SPECIALTY_KEYWORDS)
        if i["type"] == "test" and not found:
            found = _match(text, SPECIALTY_KEYWORDS)  # e.g. ECG -> Cardiology
        if found and found not in specialties:
            specialties.append(found)
        for key in ("provider_name", "to"):
            if f.get(key):
                names.append(f[key])
    out["specialties"] = specialties

    named = []
    for n in names:
        key = re.sub(r"^(dr\.?\s+)", "", n.strip(), flags=re.I)
        if len(key) < 4:
            continue
        for r in conn.execute(
            "select *, null::float as distance_km from providers where name ilike %s order by id limit 3",
            (f"%{key}%",),
        ).fetchall():
            if r["id"] not in {x["id"] for x in named}:
                named.append(_provider_out(r))
    out["named"] = named
    return out


@router.get("/providers")
def providers(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    specialty: list[str] = Query(default=[]),
    limit: int = Query(default=30, ge=1, le=100),
    user: dict = Depends(require_roles("patient", "hub_manager", "viewer", "doctor", "management")),
    conn=Depends(get_conn),
):
    """Providers for the chosen specialties (none = all), nearest first."""
    params = {"lat": lat, "lng": lng, "limit": limit, "specialties": specialty}
    where = "where specialty = any(%(specialties)s)" if specialty else ""
    rows = conn.execute(
        f"select *, {DISTANCE_SQL} as distance_km from providers {where} order by distance_km limit %(limit)s",
        params,
    ).fetchall()
    return [_provider_out(r) for r in rows]


@router.get("/providers/map")
def providers_map(user: dict = Depends(require_roles("management")), conn=Depends(get_conn)):
    """All providers with coordinates, for the management console map."""
    return [_provider_out(r) for r in conn.execute(
        "select *, null::float as distance_km from providers order by id").fetchall()]
