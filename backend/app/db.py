from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.config import DATABASE_URL

# prepare_threshold=None: Supabase's pooler (transaction mode) can't use prepared statements.
pool = ConnectionPool(
    DATABASE_URL,
    min_size=1,
    max_size=5,
    kwargs={"row_factory": dict_row, "prepare_threshold": None},
    open=False,
)


def get_conn():
    """FastAPI dependency. Commits when the request finishes without error."""
    with pool.connection() as conn:
        yield conn
