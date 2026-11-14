"""
rules/velocity.py — Transaction Velocity Rule.

Fires when the same user submits > 5 transactions in a 5-minute window.
Max score: +25
"""
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional

from backend.engine.base import BaseRule, RuleResult

WINDOW_MINUTES = 5
THRESHOLD_COUNT = 5
SCORE = 25


class VelocityRule(BaseRule):
    name = "VelocityRule"

    def evaluate(self, txn: dict, history: list, graph: Any) -> Optional[RuleResult]:
        current_ts = txn.get("timestamp")
        if not isinstance(current_ts, datetime):
            try:
                current_ts = datetime.fromisoformat(str(current_ts))
            except Exception:
                return None

        if current_ts.tzinfo is None:
            current_ts = current_ts.replace(tzinfo=timezone.utc)

        window_start = current_ts - timedelta(minutes=WINDOW_MINUTES)

        count = 0
        for h in history:
            h_ts = h.get("timestamp")
            if not isinstance(h_ts, datetime):
                try:
                    h_ts = datetime.fromisoformat(str(h_ts))
                except Exception:
                    continue
            if h_ts.tzinfo is None:
                h_ts = h_ts.replace(tzinfo=timezone.utc)

            if window_start <= h_ts <= current_ts:
                count += 1

        if count > THRESHOLD_COUNT:
            return RuleResult(
                rule_name=self.name,
                score=SCORE,
                reason=(
                    f"High transaction velocity: {count} transactions "
                    f"in the last {WINDOW_MINUTES} minutes (threshold: {THRESHOLD_COUNT})."
                ),
                evidence={
                    "txn_count_in_window": count,
                    "window_minutes": WINDOW_MINUTES,
                    "threshold": THRESHOLD_COUNT,
                    "window_start": window_start.isoformat(),
                    "window_end": current_ts.isoformat(),
                },
            )
        return None
