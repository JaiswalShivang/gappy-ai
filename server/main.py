"""
main.py — FastAPI Application Entry Point
==========================================
Production-grade server for the Meeting Summarizer.

Start with:
    .venv\\Scripts\\uvicorn.exe main:app --host 0.0.0.0 --port 8000 --reload
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings
from core.database import get_client, close_client
from api.routes import meetings, tasks, search, auth

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Ensure runtime directories exist ──────────────────────────────────────────
for d in ("uploads/audio", "uploads/audio_proofs", "public/audio_proofs"):
    Path(d).mkdir(parents=True, exist_ok=True)


# ── Lifespan (startup / shutdown hooks) ───────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — connecting to MongoDB…")
    get_client()
    # Pre-warm the embedding model so the first search is instant
    try:
        from services.embedding_service import _get_model
        import asyncio
        await asyncio.to_thread(_get_model)
        logger.info("Embedding model pre-warmed ✔")
    except Exception as exc:
        logger.warning("Embedding model pre-warm failed (search will still work): %s", exc)
    yield
    logger.info("Shutting down — closing MongoDB connection…")
    await close_client()


# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Minutes — Meeting Summarizer API",
    version="1.0.0",
    description="Async API: upload audio → AI extraction → Audio Proof clips → MongoDB",
    lifespan=lifespan,
)

# ── CORS — allow configured origins ──────────────────────────────────────────
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files — serve audio proofs and uploads ─────────────────────────────
# Frontend references: /uploads/audio_proofs/<file>  and  /uploads/audio/<file>
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ── API Routers ───────────────────────────────────────────────────────────────
app.include_router(auth.router,     prefix="/api/auth",     tags=["Auth"])
app.include_router(meetings.router, prefix="/api/meetings", tags=["Meetings"])
app.include_router(tasks.router,    prefix="/api/tasks",    tags=["Tasks"])
app.include_router(search.router,   prefix="/api/search",   tags=["Search"])


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Meta"])
async def health():
    return {"status": "ok", "port": settings.port}
