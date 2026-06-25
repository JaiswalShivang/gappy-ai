"""
database.py — Asynchronous MongoDB Connectivity
================================================
Manages the Motor client lifecycle and exposes high-level helpers
for persisting domain objects. All I/O is fully non-blocking.
"""

import logging
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Connection configuration — values come from .env via config.settings
# ---------------------------------------------------------------------------
MONGO_URI: str = settings.mongo_uri
DB_NAME: str = settings.mongo_db_name
COLLECTION_NAME: str = "meetings"

# Module-level singletons — Motor clients are thread-safe and meant to be
# shared across the full application lifetime (FastAPI lifespan).
_client: AsyncIOMotorClient | None = None
_db = None


def get_client() -> AsyncIOMotorClient:
    """Return (and lazily initialise) the shared Motor client."""
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URI)
        logger.info("MongoDB client initialised → %s / %s", MONGO_URI, DB_NAME)
    return _client


def get_database():
    """Return (and lazily initialise) the shared database handle."""
    global _db
    if _db is None:
        _db = get_client()[DB_NAME]
    return _db


async def close_client() -> None:
    """Gracefully close the Motor client.  Called from FastAPI shutdown hook."""
    global _client, _db
    if _client is not None:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB client closed.")


# ---------------------------------------------------------------------------
# Domain helpers
# ---------------------------------------------------------------------------

async def save_meeting(meeting_data: dict) -> str:
    """
    Persist a validated meeting payload to the `meetings` collection.

    Parameters
    ----------
    meeting_data : dict
        A fully-validated Pydantic model dumped via `.model_dump()`.
        The `datetime` fields must already be timezone-aware so that
        MongoDB stores them as proper UTC BSON dates.

    Returns
    -------
    str
        The stringified MongoDB ObjectId of the newly inserted document,
        e.g. ``"6673a2c1f4e3b1a2c3d4e5f6"``.
    """
    db = get_database()
    collection = db[COLLECTION_NAME]

    result = await collection.insert_one(meeting_data)
    inserted_id = str(result.inserted_id)

    logger.info("Meeting persisted → _id=%s  title=%s",
                inserted_id, meeting_data.get("meeting_title"))

    return inserted_id


async def get_meeting(meeting_id: str) -> dict | None:
    """
    Retrieve a single meeting document by its string ObjectId.

    Returns ``None`` when the document does not exist.
    """
    db = get_database()
    collection = db[COLLECTION_NAME]

    document = await collection.find_one({"_id": ObjectId(meeting_id)})
    if document:
        document["_id"] = str(document["_id"])  # make JSON-serialisable
    return document
