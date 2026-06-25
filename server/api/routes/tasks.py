"""
api/routes/tasks.py
===================
Routes:
  GET   /api/tasks              — list tasks for current user (?meetingId=...)
  PATCH /api/tasks/:id          — update task status/fields
"""

import logging
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from core.database import tasks_col, _serialize
from core.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def list_tasks(
    meetingId: str | None = None,
    current_user: dict = Depends(get_current_user),
):
    """Return tasks for the authenticated user, optionally filtered by meetingId."""
    query: dict = {"userId": current_user["_id"]}
    if meetingId:
        try:
            query["meetingId"] = ObjectId(meetingId)
        except Exception:
            raise HTTPException(400, detail="Invalid meetingId")

    cursor = tasks_col().find(query).sort("_id", 1)
    tasks = [_serialize(t) async for t in cursor]
    return tasks


@router.patch("/{task_id}")
async def update_task(
    task_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    """Partial update for a task. Only updates fields belonging to the current user."""
    try:
        oid = ObjectId(task_id)
    except Exception:
        raise HTTPException(400, detail="Invalid task ID")

    allowed = {"status", "priority", "assignee", "description", "title"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        raise HTTPException(422, detail="No valid fields to update")

    result = await tasks_col().find_one_and_update(
        {"_id": oid, "userId": current_user["_id"]},
        {"$set": updates},
        return_document=True,
    )
    if result is None:
        raise HTTPException(404, detail="Task not found")
    return _serialize(result)
