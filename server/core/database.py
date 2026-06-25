"""
core/database.py — Async MongoDB Client
"""

import logging
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from core.config import settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongo_uri)
        logger.info("MongoDB connected → %s", settings.mongo_db_name)
    return _client


def get_db():
    return get_client()[settings.mongo_db_name]


async def close_client():
    global _client
    if _client:
        _client.close()
        _client = None
        logger.info("MongoDB client closed.")


# ── Collection helpers ────────────────────────────────────────────────────────

def meetings_col():
    return get_db()["meetings"]


def tasks_col():
    return get_db()["tasks"]


def users_col():
    return get_db()["users"]



def _serialize(doc: dict) -> dict:
    """Convert ObjectId fields to strings for JSON serialisation."""
    if doc is None:
        return doc
    doc["_id"] = str(doc["_id"])
    for key in ("meetingId", "blockedBy"):
        if key in doc and doc[key] is not None:
            doc[key] = str(doc[key])
    return doc
