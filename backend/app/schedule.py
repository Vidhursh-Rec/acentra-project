"""Schedule step: turn an approved plan into task rows (reminders + calendar).

Only future tasks are created. Removed items and items without times/dates create nothing.
"""
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.config import ONGOING_MED_FALLBACK_DAYS, SLOT_WINDOWS, TIMEZONE

TZ = ZoneInfo(TIMEZONE)
CALENDAR_TIME = time(9, 0)  # appointments/tests have a date only
DATED_TYPES = ("appointment", "test", "referral")


def slot_for(t: time) -> str:
    if t.hour < 12:
        return "morning"
    if t.hour < 18:
        return "afternoon"
    return "night"


def on_time_deadline(scheduled_at: datetime, slot: str | None) -> datetime:
    """Marked done before this = Completed; after = Taken late."""
    local = scheduled_at.astimezone(TZ)
    end = datetime.combine(local.date(), SLOT_WINDOWS[slot or slot_for(local.time())][1], TZ)
    return max(end, local + timedelta(hours=1))  # a dose timed after its window still gets an hour


def _time(s) -> time | None:
    try:
        return time.fromisoformat(str(s))
    except ValueError:
        return None


def _date(s) -> date | None:
    try:
        return date.fromisoformat(str(s))
    except ValueError:
        return None


def first_follow_up(items: list[dict], today: date) -> date | None:
    dates = [
        d for i in items
        if i["type"] == "appointment" and not i["removed"]
        and (d := _date(i["fields"].get("resolved_date"))) and d > today
    ]
    return min(dates, default=None)


def tasks_for_item(item: dict, discharge_date: date | None, follow_up: date | None,
                   now: datetime) -> list[tuple]:
    """Returns (plan_item_id, scheduled_at, slot) rows for one item."""
    if item["removed"]:
        return []
    f = item["fields"]
    today = now.astimezone(TZ).date()

    if item["type"] == "med":
        times = sorted(t for t in map(_time, f.get("times") or []) if t)
        if not times:
            return []
        first_day = discharge_date or today  # duration counts from discharge
        try:
            days = int(f.get("duration_days") or 0)
        except (TypeError, ValueError):
            days = 0
        if days > 0:
            last_day = first_day + timedelta(days=days - 1)
        elif follow_up:
            last_day = follow_up
        else:
            last_day = today + timedelta(days=ONGOING_MED_FALLBACK_DAYS - 1)

        rows, day = [], max(first_day, today)
        while day <= last_day:
            for t in times:
                at = datetime.combine(day, t, TZ)
                if at > now:
                    rows.append((item["id"], at, slot_for(t)))
            day += timedelta(days=1)
        return rows

    if item["type"] in DATED_TYPES:
        d = _date(f.get("resolved_date"))
        if d:
            at = datetime.combine(d, CALENDAR_TIME, TZ)
            if at > now:
                return [(item["id"], at, None)]
    return []


def build_tasks(items: list[dict], discharge_date: date | None, now: datetime) -> list[tuple]:
    follow_up = first_follow_up(items, now.astimezone(TZ).date())
    rows = []
    for item in items:
        rows += tasks_for_item(item, discharge_date, follow_up, now)
    return rows


def insert_tasks(conn, rows: list[tuple]) -> None:
    if rows:
        with conn.cursor() as cur:
            # Unique (plan_item_id, scheduled_at): a retried or racing insert can't duplicate a task.
            cur.executemany(
                """insert into tasks (plan_item_id, scheduled_at, slot) values (%s, %s, %s)
                   on conflict (plan_item_id, scheduled_at) do nothing""",
                rows,
            )
