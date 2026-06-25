"""
api/routes/meetings.py
======================
Routes:
  POST /api/meetings/upload       — audio file upload + AI processing
  POST /api/meetings/process      — transcript text + AI processing
  GET  /api/meetings              — list meetings for current user
  GET  /api/meetings/:id          — single meeting
"""

import asyncio
import logging
import uuid
from pathlib import Path

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from core.database import meetings_col, tasks_col, _serialize
from core.security import get_current_user
from services.ai_service import extract_meeting_data
from services.audio_service import generate_audio_proof
from services.transcription_service import transcribe_audio
from services.embedding_service import generate_embeddings_batch

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOAD_DIR = Path("uploads") / "audio"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# Internal: save meeting + tasks to MongoDB
# ─────────────────────────────────────────────────────────────────────────────

async def _persist_and_respond(
    ai_data: dict, title: str, user_id: str, audio_path: str | None = None
) -> dict:
    """
    1. Batch-embed all task descriptions.
    2. Insert meeting document (with userId).
    3. For each task: cut audio proof, insert task (with userId + embedding).
    4. Return { meeting, tasks } — embeddings stripped from response.
    """
    raw_tasks: list = ai_data.get("tasks", [])

    # ── Batch embed ──────────────────────────────────────────────────────────
    embed_texts = [
        f"{t.get('title', '')} {t.get('description', '')}".strip()
        for t in raw_tasks
    ]
    try:
        embeddings = await generate_embeddings_batch(embed_texts)
    except Exception as exc:
        logger.warning("Embedding generation failed (%s) — saving without vectors.", exc)
        embeddings = [None] * len(raw_tasks)

    # ── Insert meeting ───────────────────────────────────────────────────────
    meeting_doc = {
        "userId": user_id,
        "title": title or "Untitled Meeting",
        "summary": ai_data["summary"],
        "participants": ai_data["participants"],
        "actionItems": [],
        "duration": ai_data["duration"],
        "status": "Action Items Generated",
        "audioPath": f"/uploads/audio/{Path(audio_path).name}" if audio_path else None,
    }
    result = await meetings_col().insert_one(meeting_doc)
    meeting_id = result.inserted_id
    meeting_doc["_id"] = str(meeting_id)

    # ── Insert tasks ─────────────────────────────────────────────────────────
    async def _process_task(raw: dict, idx: int, embedding: list | None) -> dict:
        task_id = f"task_{meeting_doc['_id'][:8]}_{idx:03d}"

        audio_url = None
        if audio_path:
            audio_url = await generate_audio_proof(
                src_path=audio_path,
                start_seconds=int(raw.get("startTime", 0)),
                end_seconds=int(raw.get("endTime", 0)),
                task_id=task_id,
            )

        task_doc = {
            "userId": user_id,
            "meetingId": meeting_id,
            "title": raw["title"],
            "description": raw["description"],
            "assignee": raw["assignee"],
            "priority": raw["priority"],
            "status": "To Do",
            "sourceQuote": raw["sourceQuote"],
            "startTime": raw["startTime"],
            "endTime": raw["endTime"],
            "audioClipPath": audio_url,
            "blockedBy": None,
            "embedding": embedding,
        }
        t_result = await tasks_col().insert_one(task_doc)
        task_doc["_id"] = str(t_result.inserted_id)
        task_doc["meetingId"] = str(meeting_id)
        task_doc.pop("embedding", None)
        return task_doc

    tasks = await asyncio.gather(
        *[
            _process_task(raw, i, embeddings[i] if i < len(embeddings) else None)
            for i, raw in enumerate(raw_tasks)
        ]
    )

    task_ids = [t["_id"] for t in tasks]
    await meetings_col().update_one(
        {"_id": meeting_id},
        {"$set": {"actionItems": task_ids}},
    )
    meeting_doc["actionItems"] = task_ids

    return {"meeting": meeting_doc, "tasks": list(tasks)}


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/meetings/upload
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_audio(
    audio: UploadFile = File(..., description="Meeting audio file"),
    title: str = Form(default="Untitled Meeting"),
    current_user: dict = Depends(get_current_user),
):
    ext = Path(audio.filename or "recording.mp3").suffix or ".mp3"
    filename = f"{uuid.uuid4()}{ext}"
    audio_path = UPLOAD_DIR / filename
    audio_path.write_bytes(await audio.read())
    logger.info("Audio saved: %s", audio_path)

    logger.info("Transcribing audio file: %s", audio.filename)
    result = await transcribe_audio(str(audio_path))
    transcript = result.text
    audio_duration = result.duration
    logger.info(
        "Transcript: %d chars | timestamps=%s | duration=%.1fs",
        len(transcript), result.has_timestamps, audio_duration,
    )

    try:
        ai_data = await extract_meeting_data(transcript, title)
    except Exception as exc:
        logger.exception("AI extraction failed")
        raise HTTPException(503, detail=f"AI service error: {exc}")

    if audio_duration > 0:
        for task in ai_data.get("tasks", []):
            s = int(task.get("startTime") or 0)
            e = int(task.get("endTime") or 0)
            s = max(0, min(s, int(audio_duration)))
            e = max(0, min(e, int(audio_duration)))
            if e <= s:
                e = min(s + 30, int(audio_duration))
                if e <= s:
                    e = int(audio_duration)
                    s = max(0, e - 5)
            task["startTime"] = s
            task["endTime"] = e
        ai_data["duration"] = int(audio_duration)

    payload = await _persist_and_respond(ai_data, title, current_user["_id"], str(audio_path))
    return JSONResponse(status_code=201, content=payload)


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/meetings/process
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/process", status_code=status.HTTP_201_CREATED)
async def process_transcript(
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    transcript = body.get("transcript", "").strip()
    title = body.get("title", "Untitled Meeting").strip() or "Untitled Meeting"

    if not transcript:
        raise HTTPException(422, detail="transcript is required")

    try:
        ai_data = await extract_meeting_data(transcript, title)
    except Exception as exc:
        logger.exception("AI extraction failed")
        raise HTTPException(503, detail=f"AI service error: {exc}")

    payload = await _persist_and_respond(ai_data, title, current_user["_id"], audio_path=None)
    return JSONResponse(status_code=201, content=payload)


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/meetings
# ─────────────────────────────────────────────────────────────────────────────

@router.get("")
async def list_meetings(current_user: dict = Depends(get_current_user)):
    """Return meetings for the authenticated user, newest first."""
    cursor = meetings_col().find({"userId": current_user["_id"]}).sort("_id", -1).limit(50)
    meetings = [_serialize(m) async for m in cursor]
    return meetings


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/meetings/:id
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{meeting_id}")
async def get_meeting(meeting_id: str, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(meeting_id)
    except Exception:
        raise HTTPException(400, detail="Invalid meeting ID")

    doc = await meetings_col().find_one({"_id": oid, "userId": current_user["_id"]})
    if not doc:
        raise HTTPException(404, detail="Meeting not found")
    return _serialize(doc)
