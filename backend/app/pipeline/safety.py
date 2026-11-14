"""Safety Flag (rules): mark items Needs Review. Never fills in missing values."""
import re
from collections import defaultdict

from app.pipeline.text import norm

LOW_CONFIDENCE = 0.7

VAGUE = re.compile(
    r"\b(as needed|if needed|when needed|as required|if required|as directed|as before|"
    r"adjust(?:ed)? (?:the )?dose|sos|prn|soon)\b",
    re.IGNORECASE,
)
# Care lines with a timing ("after 12 days") usually describe a visit that needs a calendar entry.
TIMED = re.compile(r"\b(after|in|within) \d+ (day|week|month)s?\b|\bon \d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b", re.IGNORECASE)
# "stop Aspirin" but not "do not stop Aspirin"
STOP = re.compile(r"(?<!not )(?<!n't )\b(stop|hold|discontinue)\b", re.IGNORECASE)


def drug_key(drug: str) -> str:
    """'Tab. Aspirin 75 mg' -> 'aspirin'. Used only to spot the same drug twice."""
    s = norm(drug)
    s = re.sub(r"^(tab|cap|syp|inj)\.?\s+", "", s)
    s = re.sub(r"\d+(\.\d+)?\s*(mg|mcg|g|ml|iu)?", " ", s)
    return " ".join(s.split())


def flag(items: list[dict], source_text: str) -> list[dict]:
    meds = [i for i in items if i["type"] == "med"]

    for item in items:
        f, reasons = item["fields"], item["reasons"]

        if item["type"] == "med":
            drug = f.get("drug")
            if not drug:
                reasons.append("Drug name missing")
            if not f.get("dose") and not (drug and re.search(r"\d", drug)):
                reasons.append("Dose missing")
            if not f.get("frequency") and not f.get("times"):
                reasons.append("Frequency missing")
            if not f.get("times"):
                reasons.append("Time missing")

        if item["type"] in ("appointment", "test", "referral") and not f.get("resolved_date"):
            reasons.append("Date missing")

        if item["type"] == "care" and (t := TIMED.search(item["source_quote"])):
            reasons.append(f'Has a timing ("{t.group(0)}") but no calendar entry; check if this is an appointment')

        m = VAGUE.search(item["source_quote"])
        if m:
            reasons.append(f'Vague instruction: "{m.group(0)}"')

        if item["confidence"] < LOW_CONFIDENCE:
            reasons.append("Low confidence")

        if item["review_note"]:
            reasons.append(f"Agent note: {item['review_note']}")

    # Same drug listed more than once
    by_drug = defaultdict(list)
    for med in meds:
        if med["fields"].get("drug"):
            by_drug[drug_key(med["fields"]["drug"])].append(med)
    for group in by_drug.values():
        if len(group) > 1:
            for med in group:
                med["reasons"].append(f"Conflicting instructions: {med['fields']['drug']} listed more than once")

    # Any line in the document says to stop / hold a listed drug.
    # Scans the source itself so it works even if extraction missed that line.
    for line in source_text.splitlines():
        if not STOP.search(line):
            continue
        nline = norm(line)
        for key, group in by_drug.items():
            if key and key in nline:
                for med in group:
                    if norm(med["source_quote"]) not in nline:  # not the med's own line
                        med["reasons"].append(f'Conflicting instruction: "{line.strip()}"')

    # An extracted advice item that stops a listed drug is flagged too.
    for item in items:
        if item["type"] == "med" or not STOP.search(item["source_quote"]):
            continue
        quote = norm(item["source_quote"])
        for key, group in by_drug.items():
            if key and key in quote:
                item["reasons"].append(f"Conflicts with medicine list: {group[0]['fields']['drug']}")

    for item in items:
        unique = list(dict.fromkeys(item["reasons"]))
        item["needs_review"] = bool(unique)
        item["review_reason"] = "; ".join(unique) or None
    return items
