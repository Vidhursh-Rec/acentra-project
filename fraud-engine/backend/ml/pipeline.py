"""
ml/pipeline.py — Isolated XGBoost anomaly scoring pipeline.

Trains on synthetic baseline data (normal transactions).
Scores new transactions via anomaly threshold.
Falls back gracefully if model is untrained.
"""
import logging
import os
from typing import Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

FEATURE_NAMES = [
    "amount",
    "velocity_5m",
    "distance_km",
    "hour_of_day",
    "is_new_device",
    "amount_ratio_to_avg",
]


def extract_features(txn: dict, history: list) -> Dict[str, float]:
    """Extract ML feature vector from transaction + history."""
    from datetime import datetime, timezone

    amount = float(txn.get("amount", 0))
    user_avg = float(txn.get("_user_avg_amount", amount) or amount)

    # Velocity in last 5 min
    ts = txn.get("timestamp")
    if ts and not isinstance(ts, datetime):
        try:
            ts = datetime.fromisoformat(str(ts))
        except Exception:
            ts = None
    if ts and ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)

    velocity_5m = 0
    if ts:
        from datetime import timedelta
        window = ts - timedelta(minutes=5)
        for h in history:
            h_ts = h.get("timestamp")
            if not isinstance(h_ts, datetime):
                try:
                    h_ts = datetime.fromisoformat(str(h_ts))
                except Exception:
                    continue
            if h_ts.tzinfo is None:
                h_ts = h_ts.replace(tzinfo=timezone.utc)
            if window <= h_ts < ts:
                velocity_5m += 1

    # Distance from previous geo
    distance_km = 0.0
    for h in reversed(history):
        if h.get("latitude") and txn.get("latitude"):
            from backend.engine.mobility import haversine_km
            try:
                distance_km = haversine_km(
                    h["latitude"], h["longitude"],
                    txn["latitude"], txn["longitude"]
                )
            except Exception:
                pass
            break

    hour_of_day = ts.hour if ts else 12.0
    is_new_device = 1.0
    device_id = txn.get("device_id")
    if device_id:
        seen_devices = {h.get("device_id") for h in history if h.get("device_id")}
        is_new_device = 0.0 if device_id in seen_devices else 1.0

    amount_ratio = amount / user_avg if user_avg > 0 else 1.0

    return {
        "amount": amount,
        "velocity_5m": float(velocity_5m),
        "distance_km": distance_km,
        "hour_of_day": float(hour_of_day),
        "is_new_device": is_new_device,
        "amount_ratio_to_avg": amount_ratio,
    }


class MLPipeline:
    """XGBoost-based anomaly scorer with SHAP support."""

    def __init__(self):
        self._model = None
        self._trained = False
        self._train_synthetic()

    def _train_synthetic(self):
        """Trains the model on synthetic normal + fraud examples."""
        try:
            import xgboost as xgb

            rng = np.random.default_rng(42)
            n_normal = 1000
            n_fraud = 100

            # Normal transactions
            X_normal = np.column_stack([
                rng.uniform(10, 500, n_normal),   # amount
                rng.integers(0, 3, n_normal).astype(float),  # velocity_5m
                rng.uniform(0, 200, n_normal),    # distance_km
                rng.integers(6, 23, n_normal).astype(float),  # hour_of_day
                rng.choice([0, 1], n_normal, p=[0.8, 0.2]).astype(float),  # is_new_device
                rng.uniform(0.5, 2.0, n_normal),  # amount_ratio
            ])
            y_normal = np.zeros(n_normal)

            # Fraud transactions
            X_fraud = np.column_stack([
                rng.uniform(2000, 50000, n_fraud),  # large amount
                rng.integers(6, 15, n_fraud).astype(float),  # high velocity
                rng.uniform(3000, 12000, n_fraud),  # impossible distance
                rng.integers(1, 4, n_fraud).astype(float),   # odd hours
                np.ones(n_fraud),                    # always new device
                rng.uniform(10, 200, n_fraud),       # extreme ratio
            ])
            y_fraud = np.ones(n_fraud)

            X = np.vstack([X_normal, X_fraud])
            y = np.concatenate([y_normal, y_fraud])

            self._model = xgb.XGBClassifier(
                n_estimators=100,
                max_depth=4,
                learning_rate=0.1,
                use_label_encoder=False,
                eval_metric="logloss",
                random_state=42,
            )
            self._model.fit(X, y)
            self._trained = True
            logger.info("ML pipeline trained on synthetic data.")
        except Exception as exc:
            logger.warning("ML training failed (XGBoost not available?): %s", exc)

    def score(self, txn: dict, history: list) -> Tuple[float, List[Dict]]:
        """
        Returns (anomaly_score 0-1, shap_attributions list).
        Falls back to (0.0, []) if model untrained.
        """
        features = extract_features(txn, history)
        if not self._trained or self._model is None:
            return 0.0, []

        try:
            X = np.array([[features[f] for f in FEATURE_NAMES]])
            prob = float(self._model.predict_proba(X)[0][1])
            return round(prob, 4), []
        except Exception as exc:
            logger.warning("ML scoring failed: %s", exc)
            return 0.0, []

    def score_with_shap(self, txn: dict, history: list) -> Tuple[float, List[Dict]]:
        """
        Returns (anomaly_score 0-1, shap_attributions [{"feature": ..., "value": ...}]).
        """
        from backend.ml.explainer import SHAPExplainer
        features = extract_features(txn, history)
        if not self._trained or self._model is None:
            return 0.0, []

        try:
            X = np.array([[features[f] for f in FEATURE_NAMES]])
            prob = float(self._model.predict_proba(X)[0][1])
            explainer = SHAPExplainer(self._model, FEATURE_NAMES)
            shap_list = explainer.explain(X)
            return round(prob, 4), shap_list
        except Exception as exc:
            logger.warning("SHAP scoring failed: %s", exc)
            score, _ = self.score(txn, history)
            return score, []


# Singleton
ml_pipeline = MLPipeline()
