"""Move a pending plan to another doctor (manual by admin, or automatic when a doctor goes
unavailable). Locks the current approval row — the same row Approve locks — so if an approve
and a reassign race, exactly one wins and the other gets a clear 409."""
from fastapi import HTTPException


def suggestions(conn, exclude: str, specialty: str | None) -> list[dict]:
    """Available doctors, same specialty first, then lowest workload."""
    return conn.execute(
        """select id, name, specialty, active_load, available from doctors
           where available and id <> %s
           order by (specialty = %s) desc, active_load asc, id""",
        (exclude, specialty),
    ).fetchall()


def reassign(conn, doc_id, to_doctor_id: str | None, by: str) -> dict:
    current = conn.execute(
        "select * from approvals where doc_id = %s order by assigned_at desc limit 1 for update",
        (doc_id,),
    ).fetchone()
    if not current:
        raise HTTPException(404, "No approval for this document")
    if current["approved_at"]:
        raise HTTPException(409, "Plan is already approved")
    doc = conn.execute("select patient_id, status from discharge_docs where id = %s", (doc_id,)).fetchone()
    if doc["status"] != "pending_review":
        raise HTTPException(409, "Plan is not waiting for review")

    old = conn.execute("select id, specialty from doctors where id = %s", (current["doctor_id"],)).fetchone()
    if to_doctor_id:
        target = conn.execute("select * from doctors where id = %s", (to_doctor_id.upper(),)).fetchone()
        if not target:
            raise HTTPException(404, "Doctor not found")
        if not target["available"]:
            raise HTTPException(409, f"{target['name']} is unavailable")
    else:
        options = suggestions(conn, old["id"], old["specialty"])
        target = options[0] if options else None
        if not target:
            raise HTTPException(409, "No available doctor to take this plan")
    if target["id"] == old["id"]:
        raise HTTPException(409, "Plan is already with this doctor")

    new = conn.execute(
        """insert into approvals (doc_id, doctor_id, reassigned_from, reassigned_by)
           values (%s, %s, %s, %s) returning *""",
        (doc_id, target["id"], old["id"], by),
    ).fetchone()
    conn.execute("update doctors set active_load = greatest(active_load - 1, 0) where id = %s", (old["id"],))
    conn.execute("update doctors set active_load = active_load + 1 where id = %s", (target["id"],))
    conn.execute("update patients set assigned_doctor_id = %s where id = %s", (target["id"], doc["patient_id"]))
    return {"approval_id": str(new["id"]), "doc_id": str(doc_id), "patient_id": doc["patient_id"],
            "from_doctor": old["id"], "to_doctor": target["id"], "to_doctor_name": target["name"]}
