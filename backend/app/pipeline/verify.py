"""Verify (rules): quotes exist in source, values exist in quotes, relative dates resolved."""
import re
from datetime import date, timedelta

from dateutil import parser as dateparser
from dateutil.relativedelta import relativedelta

from app.pipeline.text import norm

_NUMBER_WORDS = {
    1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six",
    7: "seven", 8: "eight", 9: "nine", 10: "ten", 11: "eleven", 12: "twelve",
}
DATED_TYPES = {"appointment", "test", "referral"}
# Descriptive values the doctor/patient will read; each must come from the quote.
TEXT_FIELDS = ("text", "name", "with", "specialty", "to", "provider_name", "provider_address", "frequency")


def verify(items: list[dict], source_text: str, discharge_date: date | None) -> list[dict]:
    source = norm(source_text)
    for item in items:
        quote = norm(item["source_quote"])
        fields = item["fields"]

        if not quote or quote not in source:
            item["reasons"].append("Source quote not found in document")

        if item["type"] == "med":
            for key, label in (("drug", "Drug name"), ("dose", "Dose")):
                value = fields.get(key)
                if value and norm(str(value)) not in quote:
                    fields[key] = None
                    item["reasons"].append(f"{label} not found in source quote")
            times = [t for t in fields.get("times") or [] if isinstance(t, str)]
            kept = [t for t in times if _time_in_quote(t, quote)]
            if len(kept) != len(times):
                item["reasons"].append("Time not found in source quote")
            fields["times"] = kept
            _verify_duration(fields, quote, discharge_date, item["reasons"])

        for key in TEXT_FIELDS:
            value = fields.get(key)
            if value and norm(str(value)) not in quote:
                item["reasons"].append(f"'{key}' text not found in source quote")

        if item["type"] in DATED_TYPES:
            fields["resolved_date"] = _resolve_date(fields, quote, discharge_date, item["reasons"])
    return items


_DURATION = re.compile(
    r"\bfor (\d+|" + "|".join(_NUMBER_WORDS.values()) + r") (day|week|month)s?\b"
)


def _verify_duration(fields: dict, quote: str, discharge_date: date | None, reasons: list) -> None:
    """Duration comes from the written text ("for 8 weeks"), never from the AI's arithmetic."""
    m = _DURATION.search(quote)
    llm_days = fields.get("duration_days")
    if not m:
        if llm_days is not None:
            fields["duration_days"] = None
            reasons.append("Duration not found in source quote")
        return
    word = m.group(1)
    n = int(word) if word.isdigit() else next(k for k, v in _NUMBER_WORDS.items() if v == word)
    unit = m.group(2)
    if unit == "day":
        days = n
    elif unit == "week":
        days = n * 7
    else:
        start = discharge_date or date.today()
        days = (start + relativedelta(months=n) - start).days
    if llm_days is not None and str(llm_days).strip() != str(days):
        reasons.append(f'Duration unclear: "{m.group(0)}"')
    fields["duration_days"] = days


def _time_in_quote(t: str, quote: str) -> bool:
    m = re.fullmatch(r"(\d{1,2}):(\d{2})", t.strip())
    if not m:
        return False
    h, mins = int(m.group(1)), m.group(2)
    h12 = h % 12 or 12
    ampm = "am" if h < 12 else "pm"
    variants = [
        f"{h:02d}:{mins}",
        f"{h12}:{mins} {ampm}", f"{h12}:{mins}{ampm}",
        f"{h12}.{mins} {ampm}", f"{h12}.{mins}{ampm}",
    ]
    if mins == "00":
        variants += [f"{h12} {ampm}", f"{h12}{ampm}"]
    return any(v in quote for v in variants)


def _resolve_date(fields: dict, quote: str, discharge_date: date | None, reasons: list) -> str | None:
    written = fields.get("date")
    if written and norm(str(written)) in quote:
        try:
            return dateparser.parse(str(written), dayfirst=True).date().isoformat()
        except (ValueError, OverflowError):
            reasons.append("Date could not be read")
            return None

    rel = fields.get("relative")
    if isinstance(rel, dict) and rel.get("unit") in ("days", "weeks", "months"):
        try:
            value = int(rel.get("value"))
        except (TypeError, ValueError):
            return None
        if str(value) not in quote and _NUMBER_WORDS.get(value, "#") not in quote:
            reasons.append("Relative date not found in source quote")
            return None
        if not discharge_date:
            reasons.append("Discharge date missing; cannot work out the date")
            return None
        delta = {
            "days": timedelta(days=value),
            "weeks": timedelta(weeks=value),
            "months": relativedelta(months=value),
        }[rel["unit"]]
        return (discharge_date + delta).isoformat()
    return None
