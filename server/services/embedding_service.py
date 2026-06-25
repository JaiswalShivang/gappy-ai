"""
services/embedding_service.py — Local Sentence Embedding via all-MiniLM-L6-v2
===============================================================================

Loads the SentenceTransformer model ONCE at module import time so every
subsequent embedding call is fast (< 5 ms on CPU, < 1 ms on GPU).

The model produces 384-dimensional cosine-similarity vectors.
These are stored in MongoDB and searched via Atlas $vectorSearch.

Public API
----------
    await generate_embedding(text)          -> List[float]   (384 dims)
    await generate_embeddings_batch(texts)  -> List[List[float]]
    generate_embedding_sync(text)           -> List[float]   (for testing)
"""

import asyncio
import logging
from typing import List

logger = logging.getLogger(__name__)

# ── Model singleton (loaded once at import, shared across all requests) ────────
_model = None


def _get_model():
    """Lazy-load the model so import is cheap; first call triggers download."""
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading SentenceTransformer model 'all-MiniLM-L6-v2' …")
            _model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("Embedding model loaded — dims=384")
        except ImportError:
            logger.error(
                "sentence-transformers not installed. "
                "Run: .venv\\Scripts\\pip.exe install sentence-transformers==3.0.1"
            )
            raise
    return _model


# ── Sync helpers (run in thread pool to avoid blocking the event loop) ─────────

def _encode_single(text: str) -> List[float]:
    """Blocking encode — call only inside asyncio.to_thread."""
    vec = _get_model().encode(text, normalize_embeddings=True)
    return vec.tolist()


def _encode_batch(texts: List[str]) -> List[List[float]]:
    """Blocking batch encode — more efficient than N single calls."""
    vecs = _get_model().encode(texts, normalize_embeddings=True, batch_size=32)
    return [v.tolist() for v in vecs]


# ── Public async API ───────────────────────────────────────────────────────────

async def generate_embedding(text: str) -> List[float]:
    """
    Asynchronously generate a 384-dim embedding for a single string.
    Safe to call from any FastAPI route — runs in a thread pool.
    """
    clean = (text or "").strip()
    if not clean:
        return [0.0] * 384
    return await asyncio.to_thread(_encode_single, clean)


async def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Asynchronously generate embeddings for multiple texts in one shot.
    Use this when embedding multiple task descriptions at once (more efficient).
    """
    cleaned = [(t or "").strip() for t in texts]
    if not any(cleaned):
        return [[0.0] * 384] * len(texts)
    return await asyncio.to_thread(_encode_batch, cleaned)


# ── Sync convenience for scripts / tests ──────────────────────────────────────

def generate_embedding_sync(text: str) -> List[float]:
    """Synchronous version — use only in tests or CLI scripts."""
    return _encode_single((text or "").strip() or "placeholder")
