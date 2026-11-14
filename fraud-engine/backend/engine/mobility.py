"""
engine/mobility.py — Haversine calculator & Customer Mobility Entropy Profiler.
"""
import math
from collections import Counter
from typing import List, Optional, Tuple


# ── Haversine ─────────────────────────────────────────────────────────────────

EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes the great-circle distance between two geographic points
    using the Haversine formula.

    Returns distance in kilometres.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))
    return EARTH_RADIUS_KM * c


def implied_speed_kmh(
    lat1: float, lon1: float, t1,
    lat2: float, lon2: float, t2,
) -> Tuple[float, float, float]:
    """
    Returns (distance_km, elapsed_minutes, implied_speed_kmh).
    t1/t2 must be timezone-aware datetime objects.
    """
    dist_km = haversine_km(lat1, lon1, lat2, lon2)
    delta_seconds = abs((t2 - t1).total_seconds())
    delta_hours = max(delta_seconds / 3600.0, 1e-9)   # avoid ZeroDivisionError
    delta_minutes = delta_seconds / 60.0
    speed = dist_km / delta_hours
    return dist_km, delta_minutes, speed


# ── Mobility Entropy Profiler ─────────────────────────────────────────────────

class MobilityProfiler:
    """
    Computes spatial entropy for a user based on city visit frequency.

    Entropy H = -Σ p_i * log2(p_i)
    A traveller who visits many unique cities has high entropy.
    A homebody with one city has H ≈ 0.
    """

    @staticmethod
    def entropy(cities: List[Optional[str]]) -> float:
        non_null = [c for c in cities if c]
        if not non_null:
            return 0.0
        counts = Counter(non_null)
        total = sum(counts.values())
        h = 0.0
        for cnt in counts.values():
            p = cnt / total
            h -= p * math.log2(p)
        return round(h, 4)

    @staticmethod
    def is_outlier(city_entropy: float, threshold: float = 3.0) -> bool:
        """Returns True when the user's entropy exceeds the threshold."""
        return city_entropy > threshold
