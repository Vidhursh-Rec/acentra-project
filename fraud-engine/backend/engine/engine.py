"""
engine/engine.py — Rule auto-discovery aggregator.

Uses pkgutil + importlib to discover all BaseRule subclasses in the
`backend/rules/` package automatically.  New rules are registered by
simply dropping a .py file in that folder.
"""
import importlib
import logging
import pkgutil
from typing import Any, Dict, List, Optional, Tuple

from backend.engine.base import BaseRule, RuleResult

logger = logging.getLogger(__name__)

# Risk-level thresholds
RISK_LEVELS = [
    (70, "HIGH"),
    (30, "MEDIUM"),
    (1,  "LOW"),
    (0,  "NONE"),
]

MAX_SCORE = 100


class RuleEngine:
    """Loads all rules from backend.rules and aggregates their scores."""

    def __init__(self):
        self._rules: List[BaseRule] = []
        self._load_rules()

    def _load_rules(self) -> None:
        import backend.rules as rules_pkg  # noqa: PLC0415

        discovered: List[BaseRule] = []
        for _finder, module_name, _is_pkg in pkgutil.iter_modules(rules_pkg.__path__):
            full_name = f"backend.rules.{module_name}"
            try:
                module = importlib.import_module(full_name)
            except Exception as exc:  # pragma: no cover
                logger.warning("Could not load rule module %s: %s", full_name, exc)
                continue

            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if (
                    isinstance(attr, type)
                    and issubclass(attr, BaseRule)
                    and attr is not BaseRule
                ):
                    try:
                        instance = attr()
                        discovered.append(instance)
                        logger.info("Registered rule: %s", instance.name)
                    except Exception as exc:  # pragma: no cover
                        logger.warning("Could not instantiate %s: %s", attr_name, exc)

        self._rules = discovered
        logger.info("Rule engine ready — %d rules loaded", len(self._rules))

    def evaluate(
        self,
        txn: dict,
        history: list,
        graph: Any,
        ml_score: float = 0.0,
        shap_attributions: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        """
        Runs all rules and returns an aggregated risk payload.

        Returns:
            {
                "total_score": int,          # 0-100 capped
                "risk_level": str,           # NONE / LOW / MEDIUM / HIGH
                "ml_anomaly_score": float,
                "rules_fired": [str, ...],
                "results": [RuleResult, ...],
            }
        """
        fired_results: List[RuleResult] = []
        total = 0

        for rule in self._rules:
            try:
                result: Optional[RuleResult] = rule.evaluate(txn, history, graph)
                if result is not None:
                    fired_results.append(result)
                    total += result.score
            except Exception as exc:   # pragma: no cover
                logger.exception("Rule %s raised an exception: %s", rule.name, exc)

        total = min(total, MAX_SCORE)
        risk_level = self._risk_level(total)

        return {
            "total_score": total,
            "risk_level": risk_level,
            "ml_anomaly_score": ml_score,
            "rules_fired": [r.rule_name for r in fired_results],
            "results": fired_results,
        }

    @staticmethod
    def _risk_level(score: int) -> str:
        for threshold, level in RISK_LEVELS:
            if score >= threshold:
                return level
        return "NONE"

    @property
    def rule_names(self) -> List[str]:
        return [r.name for r in self._rules]
