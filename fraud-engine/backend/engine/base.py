"""
engine/base.py — BaseRule abstract class and RuleResult dataclass.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class RuleResult:
    rule_name: str
    score: int
    reason: str
    evidence: Dict[str, Any] = field(default_factory=dict)


class BaseRule(ABC):
    name: str = "BaseRule"

    @abstractmethod
    def evaluate(
        self,
        txn: dict,
        history: list,
        graph: Any,
    ) -> Optional[RuleResult]:
        """
        Evaluates a single transaction against its history and entity graph.

        Args:
            txn:     The current transaction as a plain dict.
            history: List of previous transaction dicts for the same user,
                     sorted ascending by timestamp.
            graph:   The FraudGraph instance (NetworkX wrapper).

        Returns:
            A RuleResult if the rule fires, or None if it does not apply.
        """
        pass
