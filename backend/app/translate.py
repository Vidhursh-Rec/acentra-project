"""Translate step: generate EN / TA / HI text once at approval and store it.

Medicines: fixed template (med_text.py). Everything else: gpt-oss-20b, then a rule
check that every number survived. If translation fails, ta/hi stay empty and the app
shows the English text — the patient is never shown a guessed value.
"""
import json
import logging
import re
from datetime import datetime, timezone

from app.config import GROQ_TRANSLATE_MODEL
from app.med_text import med_texts
from app.pipeline.llm import LLMError, chat_json

log = logging.getLogger("translate")

SYSTEM = """You translate short hospital follow-up instructions for elderly patients in India
into simple Tamil and simple Hindi.
Return JSON only: {"items": [{"id": "<same id>", "ta": "<Tamil>", "hi": "<Hindi>"}]}
Rules:
- Translate the meaning exactly. Do not add, remove, explain or soften anything. No medical advice.
- Keep drug names, doses, numbers, units, dates, times, phone numbers, person names and
  hospital names exactly as written, in English letters.
- Use everyday words an elderly person understands.
- Return one entry for every id."""

_NUMBERS = re.compile(r"\d+(?:[.:/]\d+)*")
BATCH = 20


def english_text(item: dict) -> str:
    f = item["fields"]
    t = item["type"]
    if t == "appointment":
        return f"Follow-up appointment: {f.get('with') or f.get('specialty') or ''}".strip()
    if t == "test":
        return f"Test: {f.get('name') or ''}".strip()
    if t == "referral":
        return "Referral: " + " — ".join(v for v in (f.get("specialty"), f.get("to")) if v)
    return f.get("text") or item["source_quote"]


def _numbers_kept(source: str, translated: str) -> bool:
    return sorted(_NUMBERS.findall(source)) == sorted(_NUMBERS.findall(translated))


def _translate_batch(batch: list[dict], texts: dict[str, dict]) -> None:
    try:
        out = chat_json(GROQ_TRANSLATE_MODEL, SYSTEM, json.dumps({"items": batch}, ensure_ascii=False))
    except LLMError as e:
        log.warning("translation failed, English will be shown: %s", e)
        return
    ids = {b["id"] for b in batch}
    for r in out.get("items") or []:
        iid = str(r.get("id"))
        if iid not in ids:
            continue
        for lang in ("ta", "hi"):
            tr = str(r.get(lang) or "").strip()
            if tr and _numbers_kept(texts[iid]["en"], tr):
                texts[iid][lang] = tr
            elif tr:
                log.warning("dropped %s translation for %s: numbers changed", lang, iid)


def translate_items(conn, items: list[dict]) -> None:
    """Fill text_en / text_ta / text_hi for the given plan items (removed items skipped)."""
    texts: dict[str, dict] = {}
    to_llm = []
    for item in items:
        if item["removed"]:
            continue
        iid = str(item["id"])
        if item["type"] == "med":
            texts[iid] = med_texts(item["fields"])
        else:
            en = english_text(item)
            texts[iid] = {"en": en, "ta": None, "hi": None}
            to_llm.append({"id": iid, "text": en})

    # Two passes: the model sometimes skips entries in a batch, so missing ones are retried once.
    for _ in range(2):
        pending = [x for x in to_llm if not (texts[x["id"]]["ta"] and texts[x["id"]]["hi"])]
        for i in range(0, len(pending), BATCH):
            _translate_batch(pending[i:i + BATCH], texts)

    now = datetime.now(timezone.utc)
    for iid, t in texts.items():
        conn.execute(
            """update plan_items set text_en = %s, text_ta = %s, text_hi = %s, translated_at = %s
               where id::text = %s""",
            (t["en"], t["ta"], t["hi"], now, iid),
        )
    log.info("translated %d items (%d via LLM)", len(texts), len(to_llm))

