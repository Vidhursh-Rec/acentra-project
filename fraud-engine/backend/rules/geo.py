"""
rules/geo.py — Impossible Geographical Location Rule.

Uses the Haversine formula to compute implied travel speed between
the user's last transaction and the current one.
If implied speed > 900 km/h (max commercial flight), fire +25.

Max score: +25
"""
from datetime import datetime, timezone
from typing import Any, Optional

from backend.engine.base import BaseRule, RuleResult
from backend.engine.mobility import implied_speed_kmh

SPEED_THRESHOLD_KMH = 900.0
SCORE = 25


class GeoRule(BaseRule):
    name = "GeoRule"

    def evaluate(self, txn: dict, history: list, graph: Any) -> Optional[RuleResult]:
        lat2 = txn.get("latitude")
        lon2 = txn.get("longitude")
        if lat2 is None or lon2 is None:
            return None

        current_ts = txn.get("timestamp")
        if not isinstance(current_ts, datetime):
            try:
                current_ts = datetime.fromisoformat(str(current_ts))
            except Exception:
                return None
        if current_ts.tzinfo is None:
            current_ts = current_ts.replace(tzinfo=timezone.utc)

        # Find the most recent historical txn with geo data
        prev_txn = None
        for h in reversed(history):
            if h.get("latitude") is not None and h.get("longitude") is not None:
                h_ts = h.get("timestamp")
                if not isinstance(h_ts, datetime):
                    try:
                        h_ts = datetime.fromisoformat(str(h_ts))
                    except Exception:
                        continue
                if h_ts.tzinfo is None:
                    h_ts = h_ts.replace(tzinfo=timezone.utc)
                if h_ts < current_ts:
                    prev_txn = {**h, "timestamp": h_ts}
                    break

        if prev_txn is None:
            return None

        lat1, lon1, t1 = prev_txn["latitude"], prev_txn["longitude"], prev_txn["timestamp"]
        dist_km, elapsed_min, speed_kmh = implied_speed_kmh(lat1, lon1, t1, lat2, lon2, current_ts)

        if speed_kmh > SPEED_THRESHOLD_KMH:
            prev_city = prev_txn.get("city", "Unknown")
            curr_city = txn.get("city", "Unknown")
            return RuleResult(
                rule_name=self.name,
                score=SCORE,
                reason=(
                    f"Impossible travel: {prev_city} → {curr_city} "
                    f"({dist_km:,.1f} km in {elapsed_min:.1f} min = {speed_kmh:,.1f} km/h)."
                ),
                evidence={
                    "prev_city": prev_city,
                    "curr_city": curr_city,
                    "prev_time": t1.isoformat(),
                    "curr_time": current_ts.isoformat(),
                    "distance_km": round(dist_km, 1),
                    "elapsed_min": round(elapsed_min, 1),
                    "implied_speed_kmh": round(speed_kmh, 1),
                    "threshold_kmh": SPEED_THRESHOLD_KMH,
                    "prev_coords": [lat1, lon1],
                    "curr_coords": [lat2, lon2],
                },
            )
        return None
