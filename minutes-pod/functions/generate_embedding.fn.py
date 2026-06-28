"""
functions/generate_embedding.fn.py
====================================
Lemma Functions:
  generate_embedding(text)              -> List[float]         (384-dim)
  generate_embeddings_batch(texts)      -> List[List[float]]
  async_embed_and_save(task_ids, meeting_id, pod_db) -> dict

Replaces: services/embedding_service.py
Updated:  Decision 4 — added async_embed_and_save() for background workflow.

Uses the all-MiniLM-L6-v2 SentenceTransformer model (384-dim cosine similarity).
The model is loaded once (singleton) and reused across all calls.

Public Functions:
  generate_embedding       — single text → 384-dim float list (for search query)
  generate_embeddings_batch — batch of texts → list of 384-dim float lists (for tasks)
  async_embed_and_save     — background job: fetch tasks → embed → write back → update meeting status

Exposed to agents: NONE — called by workflows only.
"""

import asyncio
from typing import List, Annotated

from lemma import fn, inject

# ── Model singleton (loaded once; first call triggers model download) ─────────
_model = None


def _get_model():
    """Lazy-load the SentenceTransformer model. Thread-safe singleton."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def _encode_single(text: str) -> List[float]:
    """Blocking encode — run inside asyncio.to_thread to avoid blocking the event loop."""
    vec = _get_model().encode(text, normalize_embeddings=True)
    return vec.tolist()


def _encode_batch(texts: List[str]) -> List[List[float]]:
    """
    Blocking batch encode — more efficient than N single calls.
    batch_size=32 balances memory and throughput on CPU.
    """
    vecs = _get_model().encode(texts, normalize_embeddings=True, batch_size=32)
    return [v.tolist() for v in vecs]


# ── Public Lemma Functions ────────────────────────────────────────────────────

@fn(
    name="generate_embedding",
    description=(
        "Generate a 384-dim cosine-similarity embedding for a single text string "
        "using the all-MiniLM-L6-v2 SentenceTransformer model. "
        "Used for embedding a semantic search query before calling vector_search."
    ),
)
async def generate_embedding(text: str) -> List[float]:
    """
    Asynchronously generate a 384-dim embedding for a single string.
    Safe to call from any workflow step — runs in a thread pool.
    Returns a zero vector for empty/null input.
    """
    clean = (text or "").strip()
    if not clean:
        return [0.0] * 384
    return await asyncio.to_thread(_encode_single, clean)


@fn(
    name="generate_embeddings_batch",
    description=(
        "Generate 384-dim embeddings for a batch of text strings. "
        "More efficient than calling generate_embedding N times. "
        "Used to embed all task descriptions for a meeting in one shot."
    ),
)
async def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Asynchronously generate embeddings for multiple texts in one shot.
    Returns zero vectors for a fully empty batch.
    """
    cleaned = [(t or "").strip() for t in texts]
    if not any(cleaned):
        return [[0.0] * 384] * len(texts)
    return await asyncio.to_thread(_encode_batch, cleaned)


@fn(
    name="async_embed_and_save",
    description=(
        "Background job: fetch tasks by ID, generate embeddings in batch, "
        "write embeddings back to tasks table with status=done, and update "
        "the parent meeting status to Ready (or Error on failure). "
        "Decision 4: runs asynchronously; does NOT block the API response."
    ),
    table_permissions=["tasks:read", "tasks:update", "meetings:update"],
)
async def async_embed_and_save(
    task_ids: List[str],
    meeting_id: str,
    pod_db: Annotated[object, inject("pod.db")],
) -> dict:
    """
    Asynchronous background embedding job.

    Workflow:
      1. Fetch all tasks for this meeting by their IDs.
      2. Build embed texts: "<title> <description>" for each task.
      3. Batch-generate 384-dim embeddings.
      4. Write each embedding + status=done back to the tasks table.
      5. Update meeting.status = "Ready" (or "Error" if any task failed).

    Returns:
      { status: str, embedded: int, failed: int }
    """
    # Fetch all tasks by ID
    tasks = await pod_db.tasks.find_many({"id": {"$in": task_ids}})

    if not tasks:
        # No tasks found — mark meeting Ready (empty meetings are valid)
        await pod_db.meetings.update(meeting_id, {"status": "Ready"})
        return {"status": "Ready", "embedded": 0, "failed": 0}

    # Build embedding texts
    texts = [
        f"{t.get('title', '')} {t.get('description', '')}".strip()
        for t in tasks
    ]

    # Batch embed
    try:
        embeddings = await generate_embeddings_batch(texts)
    except Exception as exc:
        # Total embedding failure — mark all tasks and meeting as Error
        for task in tasks:
            await pod_db.tasks.update(task["id"], {"embedding_status": "failed"})
        await pod_db.meetings.update(meeting_id, {"status": "Error"})
        return {"status": "Error", "embedded": 0, "failed": len(tasks), "error": str(exc)}

    # Write embeddings back to tasks table
    embedded = 0
    failed = 0
    for task, vector in zip(tasks, embeddings):
        try:
            await pod_db.tasks.update(task["id"], {
                "embedding": vector,
                "embedding_status": "done",
            })
            embedded += 1
        except Exception:
            await pod_db.tasks.update(task["id"], {"embedding_status": "failed"})
            failed += 1

    # Update meeting status
    final_status = "Ready" if failed == 0 else "Error"
    await pod_db.meetings.update(meeting_id, {"status": final_status})

    return {"status": final_status, "embedded": embedded, "failed": failed}
