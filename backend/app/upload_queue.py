"""Durable upload queue (testing.md, Test 3).

POST /patient/upload only stores the file and inserts a 'queued' row, so it answers fast and
never waits on Groq. This worker (run every few seconds by APScheduler) claims one job at a
time with FOR UPDATE SKIP LOCKED — safe with two servers — and runs the pipeline.

Groq rate limit / network trouble -> back to 'queued' with exponential backoff (5, 10, 20, 40 s,
capped), rejected with a reason after QUEUE_MAX_ATTEMPTS. A job whose worker died is requeued. Nothing is lost.
"""
import logging
from datetime import datetime, timedelta, timezone

import httpx

from app import storage
from app.config import (
    QUEUE_BACKOFF_MAX_SECONDS, QUEUE_BACKOFF_SECONDS, QUEUE_MAX_ATTEMPTS, QUEUE_STUCK_MINUTES,
)
from app.db import pool
from app.pipeline.llm import LLMBusy
from app.pipeline.run import run_pipeline

log = logging.getLogger("upload_queue")

STUCK_AFTER = timedelta(minutes=QUEUE_STUCK_MINUTES)  # 'processing' longer than this = worker died
JOBS_PER_TICK = 5


def _claim():
    with pool.connection() as conn:
        return conn.execute(
            """update discharge_docs
               set status = 'processing', attempts = attempts + 1, claimed_at = now()
               where id = (
                   select id from discharge_docs
                   where status = 'queued' and (next_attempt_at is null or next_attempt_at <= now())
                   order by uploaded_at
                   for update skip locked
                   limit 1)
               returning id, patient_id, file_path, file_type, attempts""",
        ).fetchone()


def _retry_later(doc: dict, error: Exception) -> None:
    with pool.connection() as conn:
        if doc["attempts"] >= QUEUE_MAX_ATTEMPTS:
            log.warning("doc %s gave up after %d attempts: %s", doc["id"], doc["attempts"], error)
            conn.execute(
                """update discharge_docs set status = 'rejected', rejection_reason = 'PROCESSING_FAILED',
                          last_error = %s, claimed_at = null
                   where id = %s and status = 'processing'""",
                (str(error)[:500], doc["id"]),
            )
            return
        # 5, 10, 20, 40 s ... capped
        wait = timedelta(seconds=min(QUEUE_BACKOFF_SECONDS * 2 ** (doc["attempts"] - 1), QUEUE_BACKOFF_MAX_SECONDS))
        log.info("doc %s busy (%s); retry %d in %ss", doc["id"], type(error).__name__, doc["attempts"], wait.seconds)
        conn.execute(
            """update discharge_docs set status = 'queued', next_attempt_at = %s, last_error = %s, claimed_at = null
               where id = %s and status = 'processing'""",
            (datetime.now(timezone.utc) + wait, str(error)[:500], doc["id"]),
        )


def requeue_stuck() -> None:
    with pool.connection() as conn:
        n = conn.execute(
            """update discharge_docs set status = 'queued', claimed_at = null, last_error = 'worker stopped mid-way'
               where status = 'processing' and claimed_at < %s""",
            (datetime.now(timezone.utc) - STUCK_AFTER,),
        ).rowcount
    if n:
        log.warning("requeued %d stuck upload(s)", n)


def process_queue() -> None:
    requeue_stuck()
    for _ in range(JOBS_PER_TICK):
        doc = _claim()
        if not doc:
            return
        try:
            data = storage.download(doc["file_path"])
            run_pipeline(str(doc["id"]), doc["patient_id"], data, doc["file_type"])
        except (LLMBusy, httpx.HTTPError) as e:
            _retry_later(doc, e)
