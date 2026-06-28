"""
functions/vector_search.fn.py
==============================
Lemma Function: vector_search

Replaces: api/routes/search.py ($vectorSearch pipeline)
Decision 2: MongoDB Atlas kept as external vector store — NOT replaced by Lemma native.

Runs a MongoDB Atlas $vectorSearch aggregate pipeline over the tasks collection,
pre-filtered to the current user's tasks only.

Strategy (mirrors original search.py):
  1. Primary pipeline: $vectorSearch with userId filter (Atlas pre-filter)
  2. Fallback: $vectorSearch without pre-filter + post-match (older Atlas versions)
  3. On index error: raise descriptive exception

Input:
  query_vector (List[float])  — 384-dim embedding of the user's search query
  user_id (str)               — Lemma user ID (replaces MongoDB ObjectId string)
  limit (int)                 — max results to return (1–10, default 5)

Output:
  List[dict] — matched tasks, embedding field stripped, searchScore added

Exposed to agents: NONE — called only by semantic_search workflow.
"""

from typing import List, Annotated

from lemma import fn, Secret

VECTOR_INDEX_NAME = "task_embedding_index"


@fn(
    name="vector_search",
    description=(
        "Run a MongoDB Atlas $vectorSearch over the tasks collection, "
        "filtered to the authenticated user's tasks. "
        "Returns top-N semantically matching tasks ranked by cosine similarity. "
        "Decision 2: Atlas is kept as external vector store."
    ),
    secrets=["MONGO_URI"],
)
async def vector_search(
    query_vector: List[float],
    user_id: str,
    limit: int = 5,
    mongo_uri: Annotated[str, Secret("MONGO_URI")] = None,
    mongo_db_name: str = "meeting_summarizer",
) -> List[dict]:
    """
    Execute MongoDB Atlas $vectorSearch with a per-user row filter.

    The pipeline:
      1. $vectorSearch — ANN search over 384-dim cosine index
      2. $match        — ensure userId matches (post-filter safety net)
      3. $addFields    — attach searchScore from vectorSearchScore metadata
      4. $limit        — cap results to requested limit
      5. $project      — strip embedding field before returning
    """
    from motor.motor_asyncio import AsyncIOMotorClient

    client = AsyncIOMotorClient(mongo_uri)
    try:
        db = client[mongo_db_name]
        col = db["tasks"]

        # Primary pipeline: $vectorSearch with pre-filter (Atlas >=6.0)
        primary_pipeline = [
            {
                "$vectorSearch": {
                    "index": VECTOR_INDEX_NAME,
                    "path": "embedding",
                    "queryVector": query_vector,
                    "numCandidates": limit * 10,
                    "limit": limit * 5,   # Over-fetch so we can post-filter by userId
                    "filter": {"userId": user_id},
                }
            },
            {"$match": {"userId": user_id}},
            {"$addFields": {"searchScore": {"$meta": "vectorSearchScore"}}},
            {"$limit": limit},
            {"$project": {"embedding": 0}},
        ]

        try:
            results = []
            async for doc in col.aggregate(primary_pipeline):
                doc["_id"] = str(doc["_id"])
                if "meetingId" in doc and doc["meetingId"]:
                    doc["meetingId"] = str(doc["meetingId"])
                doc.pop("embedding", None)
                results.append(doc)
            return results

        except Exception as primary_exc:
            # Fallback: $vectorSearch without pre-filter (older Atlas versions)
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
                {"$match": {"userId": user_id}},
                {"$addFields": {"searchScore": {"$meta": "vectorSearchScore"}}},
                {"$limit": limit},
                {"$project": {"embedding": 0}},
            ]

            try:
                results = []
                async for doc in col.aggregate(fallback_pipeline):
                    doc["_id"] = str(doc["_id"])
                    if "meetingId" in doc and doc["meetingId"]:
                        doc["meetingId"] = str(doc["meetingId"])
                    doc.pop("embedding", None)
                    results.append(doc)
                return results

            except Exception as fallback_exc:
                err_str = str(fallback_exc).lower()
                if "index" in err_str or "vectorsearch" in err_str:
                    raise RuntimeError(
                        f"Vector search index '{VECTOR_INDEX_NAME}' not found. "
                        "Please create it in MongoDB Atlas UI with 384-dim cosine similarity "
                        "and a filter field on 'userId'."
                    ) from fallback_exc
                raise RuntimeError(f"Search failed: {fallback_exc}") from fallback_exc

    finally:
        client.close()
