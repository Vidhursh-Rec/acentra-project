"""
ml/explainer.py — SHAP local feature attribution generator.
"""
import logging
from typing import Any, Dict, List

import numpy as np

logger = logging.getLogger(__name__)


class SHAPExplainer:
    """Generates SHAP values using TreeExplainer for XGBoost models."""

    def __init__(self, model: Any, feature_names: List[str]):
        self._model = model
        self._feature_names = feature_names
        self._explainer = None
        self._init_explainer()

    def _init_explainer(self):
        try:
            import shap
            self._explainer = shap.TreeExplainer(self._model)
            logger.info("SHAP TreeExplainer initialised.")
        except Exception as exc:
            logger.warning("SHAP TreeExplainer failed to initialise: %s", exc)

    def explain(self, X: np.ndarray) -> List[Dict[str, Any]]:
        """
        Returns sorted SHAP attributions for the first sample in X.
        Each item: {"feature": str, "value": float}
        """
        if self._explainer is None:
            return []
        try:
            shap_values = self._explainer.shap_values(X)
            # For binary classification, shap_values may be a list [class0, class1]
            if isinstance(shap_values, list):
                vals = shap_values[1][0]   # class 1 (fraud)
            else:
                vals = shap_values[0]

            attributions = [
                {"feature": name, "value": round(float(v), 4)}
                for name, v in zip(self._feature_names, vals)
            ]
            # Sort by absolute SHAP value descending
            attributions.sort(key=lambda x: abs(x["value"]), reverse=True)
            return attributions
        except Exception as exc:
            logger.warning("SHAP explain failed: %s", exc)
            return []
