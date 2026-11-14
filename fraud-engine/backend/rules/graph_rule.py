"""
rules/graph_rule.py — Shared Entity Graph Risk Rule.

Detects fraud rings by checking if the current transaction's device_id
or shipping_address is shared across >= 3 distinct user accounts, or if
the transaction is connected to a previously confirmed fraudulent txn.

Max score: +20
"""
from typing import Any, Optional

from backend.engine.base import BaseRule, RuleResult

SCORE = 20
MIN_SHARED_USERS = 3


class GraphRule(BaseRule):
    name = "GraphRule"

    def evaluate(self, txn: dict, history: list, graph: Any) -> Optional[RuleResult]:
        if graph is None:
            return None

        risk = graph.shared_entity_risk(txn, min_shared_users=MIN_SHARED_USERS)
        contrib = risk.get("score_contribution", 0)

        if contrib <= 0:
            return None

        reasons = []
        evidence = {
            "shared_device_users": risk["shared_device_users"],
            "shared_addr_users": risk["shared_addr_users"],
            "connected_to_fraud": risk["connected_to_fraud"],
            "min_shared_threshold": MIN_SHARED_USERS,
        }

        if risk["shared_device_users"]:
            reasons.append(
                f"Device '{txn.get('device_id')}' shared by "
                f"{len(risk['shared_device_users'])} users: "
                f"{', '.join(risk['shared_device_users'][:5])}"
            )

        if risk["shared_addr_users"]:
            reasons.append(
                f"Shipping address shared by "
                f"{len(risk['shared_addr_users'])} users."
            )

        if risk["connected_to_fraud"]:
            reasons.append("Transaction entity network connects to a previously flagged fraud.")

        return RuleResult(
            rule_name=self.name,
            score=contrib,
            reason=" | ".join(reasons) if reasons else "Shared entity risk detected.",
            evidence=evidence,
        )
