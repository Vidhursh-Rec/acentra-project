"""
rules/amount.py — Unusual Transaction Amount Rule.

Fires when the transaction amount is:
  - More than 10× the user's average amount, OR
  - Has a Z-score > 3.0 relative to user history standard deviation.

Max score: +30
"""
import math
from typing import Any, List, Optional

from backend.engine.base import BaseRule, RuleResult

MULTIPLIER_THRESHOLD = 10.0
ZSCORE_THRESHOLD = 3.0
SCORE = 30


class AmountRule(BaseRule):
    name = "AmountRule"

    def evaluate(self, txn: dict, history: list, graph: Any) -> Optional[RuleResult]:
        amount = txn.get("amount", 0.0)
        user_avg = txn.get("_user_avg_amount", None)  # injected by main.py

        # Fall back: compute avg/std from history
        historical_amounts = [h.get("amount", 0.0) for h in history if h.get("amount")]
        if not historical_amounts:
            historical_amounts = []

        if user_avg is None:
            user_avg = (
                sum(historical_amounts) / len(historical_amounts)
                if historical_amounts else 100.0
            )

        # Multiplier check
        multiplier_triggered = user_avg > 0 and (amount / user_avg) >= MULTIPLIER_THRESHOLD

        # Z-score check
        zscore = 0.0
        zscore_triggered = False
        if len(historical_amounts) >= 3:
            mean = sum(historical_amounts) / len(historical_amounts)
            variance = sum((x - mean) ** 2 for x in historical_amounts) / len(historical_amounts)
            std = math.sqrt(variance)
            if std > 0:
                zscore = (amount - mean) / std
                zscore_triggered = zscore > ZSCORE_THRESHOLD

        if multiplier_triggered or zscore_triggered:
            trigger = "multiplier" if multiplier_triggered else "z-score"
            return RuleResult(
                rule_name=self.name,
                score=SCORE,
                reason=(
                    f"Unusual transaction amount ${amount:,.2f} "
                    f"(user avg: ${user_avg:,.2f}, trigger: {trigger})."
                ),
                evidence={
                    "amount": amount,
                    "user_avg_amount": round(user_avg, 2),
                    "multiplier": round(amount / user_avg, 2) if user_avg > 0 else None,
                    "multiplier_threshold": MULTIPLIER_THRESHOLD,
                    "z_score": round(zscore, 3),
                    "z_score_threshold": ZSCORE_THRESHOLD,
                    "trigger": trigger,
                },
            )
        return None
