"""
functions/clamp_timestamps.fn.py
==================================
Lemma Function: clamp_task_timestamps

Replaces: inline timestamp clamping logic in api/routes/meetings.py upload_audio()

Ensures that AI-returned task startTime/endTime values are valid offsets
within the actual audio file. Prevents LLM-hallucinated timestamps from
referencing non-existent audio positions or causing invalid FFmpeg calls.

Algorithm (mirrors original):
  - s = clamp(startTime, 0, duration)
  - e = clamp(endTime, 0, duration)
  - if e <= s: try s+30, then use full duration as last resort

Input:
  tasks (List[dict])          — raw tasks from meeting_analyst agent
  audio_duration_seconds (float) — actual duration from Whisper TranscriptionOutput

Output:
  List[dict] — same tasks with startTime/endTime clamped to valid range

Exposed to agents: NONE — called only by upload_audio_meeting workflow.
"""

from typing import List
from lemma import fn


@fn(
    name="clamp_task_timestamps",
    description=(
        "Clamp AI-returned task start/end times to the actual audio duration. "
        "Prevents LLM hallucinated timestamps from referencing non-existent audio. "
        "No-op when audio_duration_seconds is 0 (transcript-only meetings)."
    ),
)
def clamp_task_timestamps(
    tasks: List[dict],
    audio_duration_seconds: float,
) -> List[dict]:
    """
    Clamp each task's startTime and endTime to [0, audio_duration_seconds].

    If a task ends before it starts after clamping, attempt to extend
    the end time by 30 seconds. If still invalid, use the full duration
    as the end and step back 5 seconds for the start.
    """
    dur = int(audio_duration_seconds)
    if dur <= 0:
        # No duration information — cannot clamp, return as-is
        return tasks

    for task in tasks:
        s = int(task.get("startTime") or 0)
        e = int(task.get("endTime") or 0)

        # Clamp both endpoints to [0, duration]
        s = max(0, min(s, dur))
        e = max(0, min(e, dur))

        # Ensure end > start
        if e <= s:
            # Try extending end by 30 seconds
            e = min(s + 30, dur)
            if e <= s:
                # Last resort: use the very end of the audio
                e = dur
                s = max(0, e - 5)

        task["startTime"] = s
        task["endTime"] = e

    return tasks
