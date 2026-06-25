"""
api/routes/search.py — Semantic Task Search via MongoDB Atlas $vectorSearch
============================================================================

GET /api/search?q=<query>&limit=<n>
Requires: Authorization: Bearer <token>
Returns top-N semantically matching tasks belonging to the current user.
"""

import logging
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from core.database import tasks_col
from core.security import get_current_user
from services.embedding_service import generate_embedding

logger = logging.getLogger(__name__)
router = APIRouter()

VECTOR_INDEX_NAME = "task_embedding_index"


def _serialize_task(doc: dict) -> dict:
    doc.pop("embedding", None)
    doc["_id"] = str(doc["_id"])
    if "meetingId" in doc and doc["meetingId"] is not None:
        doc["meetingId"] = str(doc["meetingId"])
    if "blockedBy" in doc and doc["blockedBy"] is not None:
        doc["blockedBy"] = str(doc["blockedBy"])
    return doc


@router.get("")
async def semantic_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(default=3, ge=1, le=10),
    current_user: dict = Depends(get_current_user),
):
    q = q.strip()
    if not q:
        raise HTTPException(422, detail="Query must not be empty")

    logger.info("Semantic search: %r (limit=%d) for user %s", q, limit, current_user["_id"])

    try:
        query_vector = await generate_embedding(q)
    except Exception as exc:
        logger.error("Embedding generation failed: %s", exc)
        raise HTTPException(503, detail=f"Embedding service unavailable: {exc}")

    pipeline = [
        {
            "$vectorSearch": {
                "index": VECTOR_INDEX_NAME,
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": limit * 10,
                "limit": limit * 5,  # over-fetch so we can filter by userId
                "filter": {"userId": current_user["_id"]},
            }
        },
        {
            "$match": {"userId": current_user["_id"]}
        },
        {
            "$addFields": {"searchScore": {"$meta": "vectorSearchScore"}}
        },
        {"$limit": limit},
        {"$project": {"embedding": 0}},
    ]

    try:
        cursor = tasks_col().aggregate(pipeline)
        results = [_serialize_task(doc) async for doc in cursor]
    except Exception as exc:
        logger.error("$vectorSearch failed: %s", exc)
        # Fallback: try without the filter field (older Atlas versions)
        try:
            fallback_pipeline = [
                {
                    "$vectorSearch": {
                        "index": VECTOR_INDEX_NAME,
                        "path": "embedding",
                        "queryVector": query_vector,
                        "numCandidates": limit * 10,
                        "limit": limit * 5,
                    }
                },
                {"$match": {"userId": current_user["_id"]}},
                {"$addFields": {"searchScore": {"$meta": "vectorSearchScore"}}},
                {"$limit": limit},
                {"$project": {"embedding": 0}},
            ]
            cursor2 = tasks_col().aggregate(fallback_pipeline)
            results = [_serialize_task(doc) async for doc in cursor2]
        except Exception as exc2:
            if "index" in str(exc2).lower() or "vectorSearch" in str(exc2):
                raise HTTPException(
                    503,
                    detail=(
                        "Vector search index not found. "
                        "Please create 'task_embedding_index' in MongoDB Atlas UI."
                    ),
                )
            raise HTTPException(503, detail=f"Search failed: {exc2}")

    logger.info("Search returned %d results for %r", len(results), q)
    return {"query": q, "results": results, "count": len(results)}
