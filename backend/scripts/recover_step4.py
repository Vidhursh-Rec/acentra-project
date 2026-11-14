"""Recovery step 4 (read-only on Supabase):
1. Export the live providers table to db/seed_providers.sql.
2. Download every uploaded discharge document from Storage into ../Dataset/uploads/.
Run from backend/:  python scripts/recover_step4.py
"""
import os
import re
import sys

import psycopg
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()
from app import storage  # noqa: E402  (needs .env loaded first)

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def q(v):
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


with psycopg.connect(os.environ["DATABASE_URL"], prepare_threshold=None) as conn:
    rows = conn.execute("select id, name, type, specialty, address, phone, lat, lng from providers order by id").fetchall()
    docs = conn.execute(
        """select d.id, d.patient_id, d.file_path, d.file_type, d.status, d.uploaded_at
           from discharge_docs d order by d.patient_id, d.uploaded_at"""
    ).fetchall()

# 1. providers seed
lines = [
    "-- CareBridge provider seed: SYNTHETIC providers (Chennai). Suggestions only, not real listings.",
    "-- Recovered on 2026-11-14 by exporting the live Supabase table (the original file was lost).",
    "-- Run after schema.sql and seed.sql.",
    "",
    "insert into providers (id, name, type, specialty, address, phone, lat, lng) values",
]
lines += [("  (" + ", ".join(q(v) for v in r) + ")") + ("," if i < len(rows) - 1 else "") for i, r in enumerate(rows)]
lines[-1] += "\non conflict (id) do nothing;"
out = os.path.join(HERE, "db", "seed_providers.sql")
open(out, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
print(f"seed_providers.sql: {len(rows)} providers")

# 2. uploaded documents
dest = os.path.join(os.path.dirname(HERE), "Dataset", "uploads")
os.makedirs(dest, exist_ok=True)
ok = fail = 0
for doc_id, pid, path, ftype, status, at in docs:
    ext = os.path.splitext(path)[1] or {"pdf": ".pdf", "image": ".jpg", "text": ".txt"}[ftype]
    name = f"{pid}_{at:%Y%m%d-%H%M%S}_{status}{ext}"
    name = re.sub(r"[^\w.\-]", "_", name)
    try:
        open(os.path.join(dest, name), "wb").write(storage.download(path))
        ok += 1
    except Exception as e:  # keep going; report at the end
        fail += 1
        print("  could not download", path, "-", type(e).__name__)
print(f"documents: {ok} downloaded, {fail} failed -> Dataset/uploads/")
