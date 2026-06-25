"""
models.py — Pydantic v2 Schema Declarations
============================================
All domain entities for the Meeting Summarizer API.
Enforced at the boundary before any data touches MongoDB.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone


class Timestamps(BaseModel):
    """Represents the verbatim time-range within an audio recording."""

    start_time: str = Field(description="Format: HH:MM:SS")
    end_time: str = Field(description="Format: HH:MM:SS")


class Task(BaseModel):
    """
    A single actionable item extracted from the meeting transcript.

    `audio_proof_url` is populated after FFmpeg slices the relevant
    audio segment and the web-accessible path is resolved.
    """

    task_id: str
    task_description: str
    assignee: str
    audio_proof_url: Optional[str] = None
    timestamps: Timestamps


class Meeting(BaseModel):
    """
    Top-level aggregate that is serialised and persisted to MongoDB.

    Pydantic v2 enforces field coercion and validation before
    `save_meeting()` in database.py ever receives the payload.
    """

    meeting_title: str
    date: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp of when the meeting was processed.",
    )
    duration_seconds: int = Field(ge=0, description="Total audio duration in seconds.")
    summary: str
    key_points: List[str] = Field(default_factory=list)
    tasks: List[Task] = Field(default_factory=list)
