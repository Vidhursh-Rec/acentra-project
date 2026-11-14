"""
services/notifier.py — AWS SNS alerting with mock fallback.
"""
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


class MockNotifier:
    """Fallback notifier that logs to console instead of publishing to SNS."""

    def send_high_risk_alert(self, flag_id: int, txn_id: str, score: int, risk_level: str):
        logger.warning(
            "[MOCK ALERT] 🚨 HIGH-RISK FRAUD FLAG | flag_id=%s txn_id=%s score=%d risk=%s",
            flag_id, txn_id, score, risk_level,
        )


class SNSNotifier:
    """AWS SNS publisher for high-risk fraud alerts."""

    def __init__(self):
        self._topic_arn = os.getenv(
            "SNS_TOPIC_ARN",
            "arn:aws:sns:us-east-1:123456789012:FraudHighRiskAlerts",
        )
        self._region = os.getenv("AWS_REGION", "us-east-1")
        self._client = None
        self._ready = False
        self._init_client()

    def _init_client(self):
        try:
            import boto3
            from botocore.exceptions import NoCredentialsError

            self._client = boto3.client("sns", region_name=self._region)
            # Quick check — will fail fast if no credentials
            self._client.get_topic_attributes(TopicArn=self._topic_arn)
            self._ready = True
            logger.info("SNS notifier ready — topic: %s", self._topic_arn)
        except Exception as exc:
            logger.info(
                "SNS not available (%s). Using mock notifier fallback.", type(exc).__name__
            )
            self._ready = False

    def send_high_risk_alert(self, flag_id: int, txn_id: str, score: int, risk_level: str):
        message = (
            f"🚨 HIGH-RISK FRAUD DETECTED\n"
            f"Flag ID : {flag_id}\n"
            f"Txn ID  : {txn_id}\n"
            f"Score   : {score}/100\n"
            f"Level   : {risk_level}\n"
        )

        if self._ready and self._client:
            try:
                self._client.publish(
                    TopicArn=self._topic_arn,
                    Message=message,
                    Subject="Fraud Alert — High Risk Transaction",
                )
                logger.info("SNS alert published for txn_id=%s", txn_id)
                return
            except Exception as exc:
                logger.warning("SNS publish failed: %s", exc)

        # Fallback
        logger.warning("[SNS FALLBACK] %s", message.replace("\n", " | "))


def get_notifier() -> SNSNotifier | MockNotifier:
    """Returns SNSNotifier; silently falls back to MockNotifier on any error."""
    try:
        n = SNSNotifier()
        if n._ready:
            return n
    except Exception:
        pass
    return MockNotifier()


# Singleton
notifier = get_notifier()
