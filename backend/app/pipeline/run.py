"""Validate -> Extract -> Verify -> Safety Flag -> Plan Sheet (routed to assigned doctor).

Called by the upload queue worker (app/upload_queue.py), never inside a web request.
LLMBusy (Groq rate limit / unreachable) is raised to the worker, which retries with backoff."""
import logging

from psycopg.types.json import Jsonb

from app.db import pool
from app.pipeline.extract import extract
from app.pipeline.llm import LLMBusy
from app.pipeline.reader import Unreadable, read_text
from app.pipeline.safety import flag
from app.pipeline.validate import validate
from app.pipeline.verify import verify

log = logging.getLogger("pipeline")


def run_pipeline(doc_id: str, patient_id: str, data: bytes, file_type: str) -> None:
    try:
        with pool.connection() as conn:
            patient = conn.execute("select * from patients where id = %s", (patient_id,)).fetchone()

        try:
            text = read_text(data, file_type)
        except Unreadable:
            return _reject(doc_id, "UNREADABLE")
        _save_text(doc_id, text)

        v = validate(text, patient)
        if v.rejection:
            return _reject(doc_id, v.rejection)

        items = flag(verify(extract(text), text, v.discharge_date), text)
        if not items:
            return _reject(doc_id, "NO_INSTRUCTIONS")

        _save_plan(doc_id, patient, v.discharge_date, items)
        log.info("doc %s: %d items, %d need review", doc_id, len(items), sum(i["needs_review"] for i in items))
    except LLMBusy:
        raise  # not the document's fault: the queue tries again later
    except Exception:
        log.exception("pipeline failed for doc %s", doc_id)
        _reject(doc_id, "PROCESSING_FAILED")


def _reject(doc_id: str, code: str) -> None:
    log.info("doc %s rejected: %s", doc_id, code)
    with pool.connection() as conn:
        conn.execute(
            """update discharge_docs set status = 'rejected', rejection_reason = %s, claimed_at = null
               where id = %s and status in ('queued', 'processing')""",
            (code, doc_id),
        )


def _save_text(doc_id: str, text: str) -> None:
    with pool.connection() as conn:
        conn.execute("update discharge_docs set raw_text = %s where id = %s", (text, doc_id))


def _save_plan(doc_id: str, patient: dict, discharge_date, items: list[dict]) -> None:
    """One transaction: plan items + status + approval routing, or nothing."""
    with pool.connection() as conn, conn.transaction():
        # Only the worker that still owns this job may save it (guards against a stale duplicate run).
        if not conn.execute(
            """update discharge_docs set status = 'pending_review', discharge_date = %s, claimed_at = null
               where id = %s and status = 'processing' returning id""",
            (discharge_date, doc_id),
        ).fetchone():
            log.warning("doc %s no longer processing; plan not saved", doc_id)
            return
        for item in items:
            conn.execute(
                """insert into plan_items (doc_id, type, fields, source_quote, needs_review, review_reason)
                   values (%s, %s, %s, %s, %s, %s)""",
                (doc_id, item["type"], Jsonb(item["fields"]), item["source_quote"],
                 item["needs_review"], item["review_reason"]),
            )
        conn.execute(
            "insert into approvals (doc_id, doctor_id) values (%s, %s)",
            (doc_id, patient["assigned_doctor_id"]),
        )
        conn.execute(
            "update doctors set active_load = active_load + 1 where id = %s",
            (patient["assigned_doctor_id"],),
        )
