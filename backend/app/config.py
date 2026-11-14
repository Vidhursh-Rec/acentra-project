import os
from datetime import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing environment variable: {name}")
    return value


SUPABASE_URL = _required("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = _required("SUPABASE_SERVICE_ROLE_KEY")
DATABASE_URL = _required("DATABASE_URL")
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "discharge-docs")

GROQ_API_KEY = _required("GROQ_API_KEY")
GROQ_EXTRACT_MODEL = os.getenv("GROQ_EXTRACT_MODEL", "openai/gpt-oss-120b")
GROQ_TRANSLATE_MODEL = os.getenv("GROQ_TRANSLATE_MODEL", "openai/gpt-oss-20b")

JWT_SECRET = _required("JWT_SECRET")
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "24"))

TESSERACT_CMD = os.getenv("TESSERACT_CMD")  # only if tesseract is not on PATH

MAX_UPLOAD_MB = 10

TIMEZONE = os.getenv("TIMEZONE", "Asia/Kolkata")
EMERGENCY_NUMBER = os.getenv("EMERGENCY_NUMBER", "108")
MISSED_DOSE_WINDOW_HOURS = int(os.getenv("MISSED_DOSE_WINDOW_HOURS", "4"))  # night: no next slot
MISSED_CHECK_MINUTES = 5

# Upload queue (testing.md, Test 3): uploads return at once; a worker processes them.
QUEUE_POLL_SECONDS = 3
QUEUE_MAX_ATTEMPTS = 5          # then rejected with PROCESSING_FAILED
QUEUE_BACKOFF_SECONDS = 5       # 5, 10, 20, 40 ... (capped) after Groq says "slow down"
QUEUE_BACKOFF_MAX_SECONDS = 300
QUEUE_STUCK_MINUTES = 10        # a doc 'processing' this long (server died) is requeued
EXPO_ACCESS_TOKEN = os.getenv("EXPO_ACCESS_TOKEN") or None


def _window(name: str, default: str) -> tuple[time, time]:
    start, end = os.getenv(name, default).split("-")
    return time.fromisoformat(start.strip()), time.fromisoformat(end.strip())


# Dose marked before its slot ends = Completed, after = Taken late. Next slot start = Missed (Step 5).
SLOT_WINDOWS = {
    "morning": _window("SLOT_MORNING", "06:00-11:00"),
    "afternoon": _window("SLOT_AFTERNOON", "12:00-16:00"),
    "night": _window("SLOT_NIGHT", "18:00-22:00"),
}
APPROVAL_WINDOW_HOURS = int(os.getenv("APPROVAL_WINDOW_HOURS", "12"))
ONGOING_MED_FALLBACK_DAYS = 30  # ongoing med with no follow-up appointment
