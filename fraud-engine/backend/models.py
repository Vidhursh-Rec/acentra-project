"""
models.py — SQLAlchemy ORM models for the Fraud Detection Platform.
Tables: users, transactions, fraud_flags, flag_reasons, review_actions
"""
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Float, Integer, DateTime,
    ForeignKey, Text, Enum as SAEnum, JSON
)
from sqlalchemy.orm import relationship
from backend.db import Base


class RiskLevel(str, enum.Enum):
    NONE = "NONE"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class FlagStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED_FRAUD = "CONFIRMED_FRAUD"
    CLEARED = "CLEARED"
    ESCALATED = "ESCALATED"


class User(Base):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    home_city = Column(String, nullable=True)
    home_lat = Column(Float, nullable=True)
    home_lon = Column(Float, nullable=True)
    avg_amount = Column(Float, default=100.0)
    mobility_entropy = Column(Float, default=0.0)

    transactions = relationship("Transaction", back_populates="user", lazy="selectin")


class Transaction(Base):
    __tablename__ = "transactions"

    txn_id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    merchant = Column(String, nullable=True)
    device_id = Column(String, nullable=True)
    payment_token = Column(String, nullable=True)
    shipping_address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="transactions")
    fraud_flag = relationship("FraudFlag", back_populates="transaction", uselist=False)


class FraudFlag(Base):
    __tablename__ = "fraud_flags"

    flag_id = Column(Integer, primary_key=True, autoincrement=True)
    txn_id = Column(String, ForeignKey("transactions.txn_id"), nullable=False, unique=True)
    total_score = Column(Integer, default=0)
    ml_anomaly_score = Column(Float, default=0.0)
    risk_level = Column(SAEnum(RiskLevel), default=RiskLevel.NONE)
    status = Column(SAEnum(FlagStatus), default=FlagStatus.PENDING)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    transaction = relationship("Transaction", back_populates="fraud_flag")
    reasons = relationship("FlagReason", back_populates="flag", cascade="all, delete-orphan")
    actions = relationship("ReviewAction", back_populates="flag", cascade="all, delete-orphan")


class FlagReason(Base):
    __tablename__ = "flag_reasons"

    id = Column(Integer, primary_key=True, autoincrement=True)
    flag_id = Column(Integer, ForeignKey("fraud_flags.flag_id"), nullable=False)
    rule_name = Column(String, nullable=False)
    score = Column(Integer, default=0)
    reason = Column(String, nullable=True)
    evidence = Column(JSON, default=dict)

    flag = relationship("FraudFlag", back_populates="reasons")


class ReviewAction(Base):
    __tablename__ = "review_actions"

    action_id = Column(Integer, primary_key=True, autoincrement=True)
    flag_id = Column(Integer, ForeignKey("fraud_flags.flag_id"), nullable=False)
    reviewer = Column(String, nullable=False)
    decision = Column(String, nullable=False)
    comment = Column(Text, nullable=True)
    acted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    flag = relationship("FraudFlag", back_populates="actions")
