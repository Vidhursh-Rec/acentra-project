"""Validate: is this a discharge summary for this patient? AI reads, rules decide."""
from dataclasses import dataclass
from datetime import date

from dateutil import parser as dateparser

from app.config import GROQ_EXTRACT_MODEL
from app.pipeline.llm import chat_json
from app.pipeline.text import name_key, norm

SYSTEM = """You check whether a document is a hospital discharge summary.
Return JSON only:
{
  "is_discharge_summary": true | false,
  "patient_name": "<exactly as written, or null>",
  "patient_id": "<exactly as written, or null>",
  "discharge_date": "<date of discharge exactly as written, or null>"
}
A pharmacy bill, prescription, lab report, invoice or letter is NOT a discharge summary.
Never guess. Use null when a value is not written in the document."""


@dataclass
class Validation:
    rejection: str | None = None
    discharge_date: date | None = None


def validate(text: str, patient: dict) -> Validation:
    out = chat_json(GROQ_EXTRACT_MODEL, SYSTEM, text)
    if not out.get("is_discharge_summary"):
        return Validation("NOT_DISCHARGE")

    source = norm(text)
    # Only trust values that really appear in the document.
    name = out.get("patient_name") or None
    pid = out.get("patient_id") or None
    if name and norm(name) not in source:
        name = None
    if pid and norm(pid) not in source:
        pid = None

    if not name and not pid:
        return Validation("PATIENT_DETAILS_MISSING")
    if pid and pid.strip().upper() != patient["id"].upper():
        return Validation("PATIENT_MISMATCH")
    if name and name_key(name) != name_key(patient["name"]):
        return Validation("PATIENT_MISMATCH")

    discharge_date = None
    raw = out.get("discharge_date")
    if raw and norm(raw) in source:
        try:
            discharge_date = dateparser.parse(raw, dayfirst=True).date()
        except (ValueError, OverflowError):
            pass
    return Validation(None, discharge_date)
