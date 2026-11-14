"""Extract: LLM pulls plan items, each with a word-for-word source quote."""
from app.config import GROQ_EXTRACT_MODEL
from app.pipeline.llm import chat_json

TYPES = {"med", "appointment", "test", "referral", "care", "warning"}

SYSTEM = """You extract follow-up instructions from a hospital discharge summary.
Return JSON only: {"items": [ ... ]}

Each item:
{
  "type": "med" | "appointment" | "test" | "referral" | "care" | "warning",
  "source_quote": "<the line or sentence copied WORD FOR WORD from the document>",
  "confidence": <number 0.0 to 1.0>,
  "review_note": "<short reason if the line is unclear, vague, incomplete or conflicts with another line; else null>",
  "fields": { ... }
}

fields by type:
- med: {
    "drug": "<drug name exactly as written, without Tab./Cap./Syp. prefix, e.g. 'Dolo 650', 'Aspirin'>",
    "form": "<Tab | Cap | Syp | Inj | ... as written, or null>",
    "dose": "<strength as written, e.g. '75 mg', or null>",
    "frequency": "<as written, e.g. 'twice daily', or null>",
    "times": ["HH:MM" in 24-hour format, ONLY clock times written in the line; else []],
    "duration_days": <integer only if written, else null>,
    "food": "<e.g. 'after breakfast' as written, or null>"
  }
- appointment: {
    "with": "<doctor or department as written>",
    "specialty": "<specialty as written, or null>",
    "date": "<calendar date exactly as written, or null>",
    "relative": {"value": <int>, "unit": "days" | "weeks" | "months"} or null,
    "provider_name": "<named doctor or hospital, or null>",
    "provider_address": "<address as written, or null>"
  }
- test: {"name": "<test as written>", "date": <as above>, "relative": <as above>}
- referral: {"specialty": "<as written>", "to": "<named provider or null>", "date": <as above>, "relative": <as above>}
- care: {"category": "wound" | "diet" | "activity" | "rehab" | "other", "text": "<instruction as written>"}
- warning: {"text": "<one warning sign as written>"}

Rules:
- Use only the medication, follow-up, advice/instruction and warning-sign parts. Ignore diagnosis and hospital course.
- One item per medicine, appointment, test, referral, instruction line and warning sign.
- Include every advice line, especially any line that says to stop, hold or not take a medicine.
- Do not create items for phone numbers, signatures or headings.
- "relative" is for phrases like "after 2 weeks" or "after 12 days". Do not compute dates.
- Any visit, procedure or check with a timing (e.g. "Suture removal after 12 days", "dressing change on day 5") is an appointment, not care.
- NEVER invent, infer, convert, correct or complete a value. If it is not written, use null.
- Never translate, rename or respell drug names or doses.
- Do not add medical advice.
- If a line is vague (e.g. "as needed", "adjust dose", "soon") or conflicts with another line, still extract it and set review_note."""


def extract(text: str) -> list[dict]:
    out = chat_json(GROQ_EXTRACT_MODEL, SYSTEM, text)
    items = []
    for raw in out.get("items") or []:
        if not isinstance(raw, dict) or raw.get("type") not in TYPES:
            continue
        items.append(
            {
                "type": raw["type"],
                "source_quote": str(raw.get("source_quote") or "").strip(),
                "confidence": _float(raw.get("confidence")),
                "review_note": raw.get("review_note") or None,
                "fields": raw.get("fields") if isinstance(raw.get("fields"), dict) else {},
                "reasons": [],
            }
        )
    return items


def _float(v) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0
