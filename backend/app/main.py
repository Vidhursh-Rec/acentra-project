import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import pool
from app.jobs import scheduler
from app.routes import auth, doctor, mgmt, patient, pills, providers, tasks

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logging.getLogger("apscheduler").setLevel(logging.WARNING)  # the upload worker runs every 3 s
logging.getLogger("httpx").setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool.open()
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)
    pool.close()


app = FastAPI(title="CareBridge API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(auth.router)
app.include_router(patient.router)
app.include_router(doctor.router)
app.include_router(tasks.router)
app.include_router(pills.router)
app.include_router(providers.router)
app.include_router(mgmt.router)


@app.get("/health")
def health():
    return {"ok": True}
