"""Supabase Storage via its REST API (private bucket, service key)."""
import httpx

from app.config import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET, SUPABASE_URL

_HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
}


def _url(path: str) -> str:
    return f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_STORAGE_BUCKET}/{path}"


def upload(path: str, data: bytes, content_type: str) -> None:
    r = httpx.post(
        _url(path),
        content=data,
        headers={**_HEADERS, "Content-Type": content_type, "x-upsert": "true"},
        timeout=30,
    )
    r.raise_for_status()


def signed_url(path: str, expires_in: int = 600) -> str:
    """Short-lived link so the doctor app can show the original file."""
    r = httpx.post(
        f"{SUPABASE_URL}/storage/v1/object/sign/{SUPABASE_STORAGE_BUCKET}/{path}",
        json={"expiresIn": expires_in},
        headers=_HEADERS,
        timeout=30,
    )
    r.raise_for_status()
    return f"{SUPABASE_URL}/storage/v1{r.json()['signedURL']}"


def signed_urls(paths: list[str], expires_in: int = 3600) -> dict[str, str]:
    """Many short-lived links in one request: {path: url}. Missing files are left out."""
    r = httpx.post(
        f"{SUPABASE_URL}/storage/v1/object/sign/{SUPABASE_STORAGE_BUCKET}",
        json={"expiresIn": expires_in, "paths": paths},
        headers=_HEADERS,
        timeout=30,
    )
    r.raise_for_status()
    return {e["path"]: f"{SUPABASE_URL}/storage/v1{e['signedURL']}" for e in r.json() if e.get("signedURL")}


def download(path: str) -> bytes:
    r = httpx.get(_url(path), headers=_HEADERS, timeout=30)
    r.raise_for_status()
    return r.content
