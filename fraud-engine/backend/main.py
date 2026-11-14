"""
main.py — FastAPI application: all REST endpoints, startup logic, simulator control.
"""
import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

load_dotenv()

from backend.db import get_db, init_db
from backend.engine.engine import RuleEngine
from backend.engine.graph import fraud_graph
from backend.ml.pipeline import ml_pipeline
from backend.models import (
    FlagReason, FlagStatus, FraudFlag, ReviewAction, RiskLevel, Transaction, User
)
from backend.schemas import (
    DashboardStats, FlagDetailOut, FlagOut, IngestResponse,
    ReviewActionIn, ReviewActionOut, SimulatorStatusOut, TransactionIn, TransactionOut,
)
from backend.services.notifier import notifier
from backend.simulator.simulator import Simulator

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")

app = FastAPI(title="Fraud Detection API", version="1.0.0")

CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:5173")
HIGH_RISK_THRESHOLD = int(os.getenv("HIGH_RISK_THRESHOLD", "70"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rule_engine = RuleEngine()
simulator: Optional[Simulator] = None
_simulator_task: Optional[asyncio.Task] = None


# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    await init_db()
    await _rebuild_graph()
    logger.info("Backend ready. Rules loaded: %s", rule_engine.rule_names)


async def _rebuild_graph():
    """Replays all stored transactions into the NetworkX graph on boot."""
    from sqlalchemy import text
    from backend.db import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Transaction))
        txns = result.scalars().all()
        for t in txns:
            txn_dict = _txn_to_dict(t)
            flagged = t.fraud_flag is not None and t.fraud_flag.risk_level == RiskLevel.HIGH
            fraud_graph.add_transaction(txn_dict, is_flagged=flagged)
    logger.info("Graph rebuilt from DB: %d nodes", fraud_graph.node_count)


def _txn_to_dict(t: Transaction) -> dict:
    return {
        "txn_id": t.txn_id,
        "user_id": t.user_id,
        "amount": t.amount,
        "currency": t.currency,
        "merchant": t.merchant,
        "device_id": t.device_id,
        "payment_token": t.payment_token,
        "shipping_address": t.shipping_address,
        "city": t.city,
        "latitude": t.latitude,
        "longitude": t.longitude,
        "timestamp": t.timestamp,
    }


# ── POST /transactions ────────────────────────────────────────────────────────

@app.post("/transactions", response_model=IngestResponse, status_code=201)
async def ingest_transaction(body: TransactionIn, db: AsyncSession = Depends(get_db)):
    txn_id = str(uuid.uuid4())
    ts = body.timestamp or datetime.now(timezone.utc)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)

    # Upsert user
    user_result = await db.execute(select(User).where(User.user_id == body.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        user = User(user_id=body.user_id, name=body.user_id, avg_amount=body.amount)
        db.add(user)
        await db.flush()
    else:
        # Update rolling average
        user.avg_amount = (user.avg_amount * 0.9) + (body.amount * 0.1)

    # Persist transaction
    txn_row = Transaction(
        txn_id=txn_id,
        user_id=body.user_id,
        amount=body.amount,
        currency=body.currency,
        merchant=body.merchant,
        device_id=body.device_id,
        payment_token=body.payment_token,
        shipping_address=body.shipping_address,
        city=body.city,
        latitude=body.latitude,
        longitude=body.longitude,
        timestamp=ts,
    )
    db.add(txn_row)
    await db.flush()

    # Fetch history (last 50 txns for this user)
    hist_result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == body.user_id, Transaction.txn_id != txn_id)
        .order_by(Transaction.timestamp.asc())
        .limit(50)
    )
    history = [_txn_to_dict(t) for t in hist_result.scalars().all()]

    # Build txn dict for rules
    txn_dict = {
        **_txn_to_dict(txn_row),
        "_user_avg_amount": user.avg_amount,
    }

    # ML scoring
    ml_score, shap_attrs = ml_pipeline.score_with_shap(txn_dict, history)

    # Rule engine
    eval_result = rule_engine.evaluate(txn_dict, history, fraud_graph, ml_score)

    total_score: int = eval_result["total_score"]
    risk_level_str: str = eval_result["risk_level"]
    rules_fired: List[str] = eval_result["rules_fired"]

    # Always persist a flag (score=0 = NONE)
    flag = FraudFlag(
        txn_id=txn_id,
        total_score=total_score,
        ml_anomaly_score=ml_score,
        risk_level=RiskLevel(risk_level_str),
        status=FlagStatus.PENDING,
        created_at=datetime.now(timezone.utc),
    )
    db.add(flag)
    await db.flush()

    # Persist rule reasons
    for result in eval_result["results"]:
        reason = FlagReason(
            flag_id=flag.flag_id,
            rule_name=result.rule_name,
            score=result.score,
            reason=result.reason,
            evidence=result.evidence,
        )
        db.add(reason)

    await db.flush()

    # Update graph
    is_high = risk_level_str == "HIGH"
    fraud_graph.add_transaction(txn_dict, is_flagged=is_high)
    if is_high:
        fraud_graph.mark_flagged(txn_id)

    # SNS alert
    alert_sent = False
    if total_score >= HIGH_RISK_THRESHOLD:
        try:
            notifier.send_high_risk_alert(flag.flag_id, txn_id, total_score, risk_level_str)
            alert_sent = True
        except Exception as exc:
            logger.warning("Notifier error: %s", exc)

    return IngestResponse(
        txn_id=txn_id,
        flag_id=flag.flag_id,
        total_score=total_score,
        risk_level=risk_level_str,
        ml_anomaly_score=ml_score,
        rules_fired=rules_fired,
        alert_sent=alert_sent,
    )


# ── GET /flags ────────────────────────────────────────────────────────────────

@app.get("/flags", response_model=List[FlagOut])
async def list_flags(
    status: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    q = select(FraudFlag).order_by(FraudFlag.created_at.desc()).limit(limit).offset(offset)
    if status:
        q = q.where(FraudFlag.status == status)
    if risk_level:
        q = q.where(FraudFlag.risk_level == risk_level)
    result = await db.execute(q)
    flags = result.scalars().unique().all()
    return [FlagOut.model_validate(f) for f in flags]


# ── GET /flags/{flag_id} ──────────────────────────────────────────────────────

@app.get("/flags/{flag_id}", response_model=FlagDetailOut)
async def get_flag_detail(flag_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FraudFlag).where(FraudFlag.flag_id == flag_id))
    flag = result.scalar_one_or_none()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")

    txn_result = await db.execute(
        select(Transaction).where(Transaction.txn_id == flag.txn_id)
    )
    txn = txn_result.scalar_one_or_none()
    txn_dict = _txn_to_dict(txn) if txn else {}

    # SHAP re-run for this flag
    hist_result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == txn.user_id, Transaction.txn_id != txn.txn_id)
        .order_by(Transaction.timestamp.asc())
        .limit(50)
    ) if txn else None
    history = [_txn_to_dict(t) for t in hist_result.scalars().all()] if hist_result else []

    _, shap_attrs = ml_pipeline.score_with_shap(txn_dict, history) if txn else (0.0, [])
    graph_json = fraud_graph.get_neighborhood_json(flag.txn_id)

    return FlagDetailOut(
        flag_id=flag.flag_id,
        txn_id=flag.txn_id,
        total_score=flag.total_score,
        ml_anomaly_score=flag.ml_anomaly_score,
        risk_level=flag.risk_level.value,
        status=flag.status.value,
        created_at=flag.created_at,
        reasons=[
            {"id": r.id, "rule_name": r.rule_name, "score": r.score,
             "reason": r.reason, "evidence": r.evidence or {}}
            for r in flag.reasons
        ],
        transaction=TransactionOut.model_validate(txn) if txn else None,
        shap_attributions=[{"feature": s["feature"], "value": s["value"]} for s in shap_attrs],
        graph_neighborhood=graph_json,
    )


# ── PATCH /flags/{flag_id} ────────────────────────────────────────────────────

@app.patch("/flags/{flag_id}", response_model=ReviewActionOut)
async def review_flag(
    flag_id: int,
    body: ReviewActionIn,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(FraudFlag).where(FraudFlag.flag_id == flag_id))
    flag = result.scalar_one_or_none()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")

    flag.status = FlagStatus(body.decision)

    action = ReviewAction(
        flag_id=flag_id,
        reviewer=body.reviewer,
        decision=body.decision,
        comment=body.comment,
        acted_at=datetime.now(timezone.utc),
    )
    db.add(action)
    await db.flush()
    return ReviewActionOut.model_validate(action)


# ── GET /audit ────────────────────────────────────────────────────────────────

@app.get("/audit", response_model=List[ReviewActionOut])
async def audit_log(
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ReviewAction)
        .order_by(ReviewAction.acted_at.desc())
        .limit(limit).offset(offset)
    )
    return [ReviewActionOut.model_validate(a) for a in result.scalars().all()]


# ── GET /stats ─────────────────────────────────────────────────────────────────

@app.get("/stats", response_model=DashboardStats)
async def dashboard_stats(db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count()).select_from(FraudFlag))).scalar() or 0
    high = (await db.execute(select(func.count()).select_from(FraudFlag).where(FraudFlag.risk_level == RiskLevel.HIGH))).scalar() or 0
    medium = (await db.execute(select(func.count()).select_from(FraudFlag).where(FraudFlag.risk_level == RiskLevel.MEDIUM))).scalar() or 0
    low = (await db.execute(select(func.count()).select_from(FraudFlag).where(FraudFlag.risk_level == RiskLevel.LOW))).scalar() or 0
    confirmed = (await db.execute(select(func.count()).select_from(FraudFlag).where(FraudFlag.status == FlagStatus.CONFIRMED_FRAUD))).scalar() or 0
    cleared = (await db.execute(select(func.count()).select_from(FraudFlag).where(FraudFlag.status == FlagStatus.CLEARED))).scalar() or 0
    pending = (await db.execute(select(func.count()).select_from(FraudFlag).where(FraudFlag.status == FlagStatus.PENDING))).scalar() or 0

    return DashboardStats(
        total_flags=total, high_risk=high, medium_risk=medium, low_risk=low,
        confirmed_fraud=confirmed, cleared=cleared, pending=pending,
    )


# ── Simulator control ─────────────────────────────────────────────────────────

@app.post("/simulate/start", response_model=SimulatorStatusOut)
async def start_simulator(background_tasks: BackgroundTasks):
    global simulator, _simulator_task
    if simulator and simulator.running:
        return SimulatorStatusOut(running=True, message="Simulator already running.")
    simulator = Simulator()
    background_tasks.add_task(simulator.run)
    return SimulatorStatusOut(running=True, message="Simulator started.")


@app.post("/simulate/stop", response_model=SimulatorStatusOut)
async def stop_simulator():
    global simulator
    if simulator:
        simulator.stop()
        return SimulatorStatusOut(running=False, message="Simulator stopped.")
    return SimulatorStatusOut(running=False, message="Simulator was not running.")


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/")
async def health():
    return {
        "status": "ok",
        "rules": rule_engine.rule_names,
        "graph_nodes": fraud_graph.node_count,
        "graph_edges": fraud_graph.edge_count,
    }
