"""Fixed templates for medicine text in EN / TA / HI. No LLM touches medicine text.

Drug name and dose are inserted exactly as written. Food timing ("after breakfast")
comes from a fixed dictionary; an unknown phrase stays in English rather than being guessed.
"""
import re
from datetime import time

from app.schedule import slot_for

LANGS = ("en", "ta", "hi")

SLOTS = {
    "en": {"morning": "Morning", "afternoon": "Afternoon", "night": "Night"},
    "ta": {"morning": "காலை", "afternoon": "மதியம்", "night": "இரவு"},
    "hi": {"morning": "सुबह", "afternoon": "दोपहर", "night": "रात"},
}
DURATION = {"en": "for {n} days", "ta": "{n} நாட்களுக்கு", "hi": "{n} दिनों तक"}

FOOD = {
    "before breakfast": ("காலை உணவுக்கு முன்", "नाश्ते से पहले"),
    "after breakfast": ("காலை உணவுக்குப் பின்", "नाश्ते के बाद"),
    "before lunch": ("மதிய உணவுக்கு முன்", "दोपहर के खाने से पहले"),
    "after lunch": ("மதிய உணவுக்குப் பின்", "दोपहर के खाने के बाद"),
    "before dinner": ("இரவு உணவுக்கு முன்", "रात के खाने से पहले"),
    "after dinner": ("இரவு உணவுக்குப் பின்", "रात के खाने के बाद"),
    "before food": ("உணவுக்கு முன்", "खाने से पहले"),
    "before meals": ("உணவுக்கு முன்", "खाने से पहले"),
    "after food": ("உணவுக்குப் பின்", "खाने के बाद"),
    "after meals": ("உணவுக்குப் பின்", "खाने के बाद"),
    "with food": ("உணவுடன்", "खाने के साथ"),
    "empty stomach": ("வெறும் வயிற்றில்", "खाली पेट"),
    "on an empty stomach": ("வெறும் வயிற்றில்", "खाली पेट"),
    "at bedtime": ("தூங்கும் முன்", "सोने से पहले"),
    "at night": ("இரவில்", "रात में"),
}
AND = {"ta": " மற்றும் ", "hi": " और "}


def drug_label(f: dict) -> str:
    """Drug + dose exactly as written; dose not repeated if already in the name."""
    drug, dose = f.get("drug") or "", f.get("dose")
    return f"{drug} {dose}" if dose and dose not in drug else drug


def food_i18n(food: str | None) -> dict:
    """{'en': ..., 'ta': ..., 'hi': ...}; ta/hi None if any part is not in the dictionary."""
    if not food:
        return {"en": None, "ta": None, "hi": None}
    parts = [p.strip() for p in re.split(r"\band\b|,", re.sub(r"\(.*?\)", "", food.casefold())) if p.strip()]
    out = {"en": food, "ta": None, "hi": None}
    if parts and all(p in FOOD for p in parts):
        out["ta"] = AND["ta"].join(FOOD[p][0] for p in parts)
        out["hi"] = AND["hi"].join(FOOD[p][1] for p in parts)
    return out


def time12(hhmm: str) -> str:
    h, m = map(int, hhmm.split(":"))
    return f"{h % 12 or 12}:{m:02d} {'AM' if h < 12 else 'PM'}"


def med_texts(f: dict) -> dict:
    """e.g. en: 'Dolo 650 — Morning 8:00 AM, Night 9:00 PM — after breakfast — for 5 days'."""
    food = food_i18n(f.get("food"))
    times = sorted(t for t in (f.get("times") or []) if re.fullmatch(r"\d{2}:\d{2}", str(t)))
    out = {}
    for lang in LANGS:
        parts = [drug_label(f)]
        if times:
            parts.append(", ".join(f"{SLOTS[lang][slot_for(time.fromisoformat(t))]} {time12(t)}" for t in times))
        if food[lang] or food["en"]:
            parts.append(food[lang] or food["en"])  # unknown food phrase stays in English
        if f.get("duration_days"):
            parts.append(DURATION[lang].format(n=f["duration_days"]))
        out[lang] = " — ".join(parts)
    return out
