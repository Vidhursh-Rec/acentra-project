"""
schemas.py — Pydantic v2 schemas for request/response validation.
"""
from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


# ── Transaction ───────────────────────────────────────────────────────────────

class TransactionIn(BaseModel):
    user_id: str
    amount: float
    currency: str = "USD"
    merchant: Optional[str] = None
    device_id: Optional[str] = None
    payment_token: Optional[str] = None
    shipping_address: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    # Optional explicit timestamp (simulator uses this); defaults to now
    timestamp: Optional[datetime] = None


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    txn_id: str
    user_id: str
    amount: float
    currency: str
    merchant: Optional[str]
    device_id: Optional[str]
    city: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    timestamp: datetime


# ── Fraud Flag ────────────────────────────────────────────────────────────────

class FlagReasonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rule_name: str
    score: int
    reason: Optional[str]
    evidence: Dict[str, Any] = {}


class FlagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    flag_id: int
    txn_id: str
    total_score: int
    ml_anomaly_score: float
    risk_level: str
    status: str
    created_at: datetime
    reasons: List[FlagReasonOut] = []


class SHAPItem(BaseModel):
    feature: str
    value: float


class FlagDetailOut(FlagOut):
    """Extended flag payload for the investigation cockpit."""
    transaction: Optional[TransactionOut] = None
    shap_attributions: List[SHAPItem] = []
    graph_neighborhood: Dict[str, Any] = {}


# ── Review Action ─────────────────────────────────────────────────────────────

class ReviewActionIn(BaseModel):
    reviewer: str = Field(..., min_length=1)
    decision: str = Field(..., pattern="^(CONFIRMED_FRAUD|CLEARED|ESCALATED)$")
    comment: Optional[str] = None


class ReviewActionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    action_id: int
    flag_id: int
    reviewer: str
    decision: str
    comment: Optional[str]
    acted_at: datetime


# ── Ingest Response ───────────────────────────────────────────────────────────

class IngestResponse(BaseModel):
    txn_id: str
    flag_id: Optional[int]
    total_score: int
    risk_level: str
    ml_anomaly_score: float
    rules_fired: List[str]
    alert_sent: bool


# ── Simulator ─────────────────────────────────────────────────────────────────

class SimulatorStatusOut(BaseModel):
    running: bool
    message: str


# ── Dashboard stats ───────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_flags: int
    high_risk: int
    medium_risk: int
    low_risk: int
    confirmed_fraud: int
    cleared: int
    pending: int
