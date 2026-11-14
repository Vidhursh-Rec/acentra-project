"""Fixed-template notification text (EN / TA / HI) and Expo push sending.

No LLM in this path. Text only states the fact; never advice like "take it now".
Drug names and doses are inserted exactly as written.
"""
import logging

import httpx

from app.config import EXPO_ACCESS_TOKEN

log = logging.getLogger("notify")
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

SLOT_NAMES = {
    "en": {"morning": "Morning", "afternoon": "Afternoon", "night": "Night"},
    "ta": {"morning": "காலை", "afternoon": "மதிய", "night": "இரவு"},
    "hi": {"morning": "सुबह", "afternoon": "दोपहर", "night": "रात"},
}
MISSED_TITLE = {"en": "Missed dose", "ta": "தவறிய மருந்து", "hi": "छूटी हुई खुराक"}
MISSED_BODY = {
    "en": "{slot} dose of {drug} ({time}) not marked.",
    "ta": "{slot} நேர {drug} ({time}) மருந்து குறிக்கப்படவில்லை.",
    "hi": "{slot} की {drug} ({time}) खुराक दर्ज नहीं की गई।",
}


def time12(hhmm: str) -> str:
    h, m = map(int, hhmm.split(":"))
    return f"{h % 12 or 12}:{m:02d} {'AM' if h < 12 else 'PM'}"


def missed_message(lang: str, slot: str, drug: str, hhmm: str, patient_name: str) -> tuple[str, str]:
    lang = lang if lang in MISSED_BODY else "en"
    body = MISSED_BODY[lang].format(slot=SLOT_NAMES[lang][slot], drug=drug, time=time12(hhmm))
    return f"{MISSED_TITLE[lang]} · {patient_name}", body


def send_push(messages: list[dict]) -> list[str]:
    """messages: [{"to": token, "title": ..., "body": ...}]. Returns tokens Expo says are dead."""
    if not messages:
        return []
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if EXPO_ACCESS_TOKEN:
        headers["Authorization"] = f"Bearer {EXPO_ACCESS_TOKEN}"
    dead = []
    for i in range(0, len(messages), 100):  # Expo accepts up to 100 per request
        batch = [{**m, "sound": "default"} for m in messages[i:i + 100]]
        try:
            r = httpx.post(EXPO_PUSH_URL, json=batch, headers=headers, timeout=15)
            r.raise_for_status()
            for msg, ticket in zip(batch, r.json().get("data", [])):
                if ticket.get("status") == "error":
                    log.warning("push error for %s: %s", msg["to"][:20], ticket.get("message"))
                    if (ticket.get("details") or {}).get("error") == "DeviceNotRegistered":
                        dead.append(msg["to"])
        except httpx.HTTPError as e:
            log.warning("push send failed: %s", e)
    return dead
