"""
functions/transcribe_audio.fn.py
==================================
Lemma Function: transcribe_audio

Replaces: services/transcription_service.py

Transcribes a meeting audio file using Groq Whisper (whisper-large-v3).
Uses a 3-tier fallback chain to guarantee a usable response:
  1. verbose_json + timestamp_granularities=["segment"]  — real acoustic timestamps
  2. verbose_json without granularities param            — Groq compatibility fallback
  3. plain response_format="text"                        — no timestamps, last resort

Input:
  audio_file_uri (str) — Pod-native URI: pod://files/audio/<uuid>.<ext>
  pod_files            — Lemma-injected file store handle (for reading the file bytes)

Output:
  TranscriptionOutput dataclass:
    text          (str)   — [HH:MM:SS]-bracketed transcript, or plain text on fallback
    duration_seconds (float) — actual audio duration in seconds (0.0 if unknown)
    has_timestamps  (bool) — True if [HH:MM:SS] brackets are present in text

Exposed to agents: NONE — called only by upload_audio_meeting workflow.
"""

import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated

from lemma import fn, inject, Secret

SUPPORTED_EXTENSIONS = {".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm", ".ogg"}


@dataclass
class TranscriptionOutput:
    """Carries both the transcript text and the actual audio duration."""
    text: str
    duration_seconds: float
    has_timestamps: bool


def _seconds_to_bracket(seconds: float) -> str:
    """Convert float seconds → '[HH:MM:SS]' bracket string."""
    total = max(int(seconds), 0)
    h = total // 3600
    m = (total % 3600) // 60
    s = total % 60
    return f"[{h:02d}:{m:02d}:{s:02d}]"


def _build_timestamped_transcript(segments: list) -> str:
    """
    Convert Whisper verbose_json segments into bracket-timestamped lines.

    Input:  [{start: 5.1, text: " John will fix the database."}, ...]
    Output: "[00:00:05] John will fix the database.\n[00:00:09] ..."
    """
    lines = []
    for seg in segments:
        try:
            start = getattr(seg, "start", None)
            if start is None and isinstance(seg, dict):
                start = seg.get("start", 0)
            start = float(start or 0)

            text = getattr(seg, "text", None)
            if text is None and isinstance(seg, dict):
                text = seg.get("text", "")
            text = (text or "").strip()

            if text:
                lines.append(f"{_seconds_to_bracket(start)} {text}")
        except Exception:
            continue
    return "\n".join(lines)


@fn(
    name="transcribe_audio",
    description=(
        "Transcribe a meeting audio file via Groq Whisper (whisper-large-v3). "
        "Returns a bracketed [HH:MM:SS] transcript, audio duration, and a flag "
        "indicating whether real timestamps are present."
    ),
    secrets=["GROQ_API_KEY"],
)
async def transcribe_audio(
    audio_file_uri: str,
    groq_api_key: Annotated[str, Secret("GROQ_API_KEY")],
    pod_files: Annotated[object, inject("pod.files")],
) -> TranscriptionOutput:
    """
    Main transcription function. Reads audio from Pod file store,
    writes to a temp file, calls Groq Whisper, returns structured result.
    """
    from groq import AsyncGroq

    # Determine extension from Pod URI
    filename = audio_file_uri.split("pod://files/audio/")[-1]
    path = Path(filename)
    ext = path.suffix.lower()

    if ext not in SUPPORTED_EXTENSIONS:
        return TranscriptionOutput(
            text=f"[Audio file: {filename}. Transcription skipped — unsupported format {ext}.]",
            duration_seconds=0.0,
            has_timestamps=False,
        )

    # Download audio bytes from Pod file store to a local temp file
    audio_bytes = await pod_files.read(audio_file_uri)

    client = AsyncGroq(api_key=groq_api_key)

    # ── Attempt 1: verbose_json + segment timestamps (best) ─────────────────
    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        with open(tmp_path, "rb") as f:
            resp = await client.audio.transcriptions.create(
                file=(filename, f),
                model="whisper-large-v3",
                response_format="verbose_json",
                timestamp_granularities=["segment"],
                language="en",
            )

        segments = getattr(resp, "segments", None) or []
        duration = float(getattr(resp, "duration", 0) or 0)

        if segments:
            timestamped = _build_timestamped_transcript(segments)
            return TranscriptionOutput(
                text=timestamped,
                duration_seconds=duration,
                has_timestamps=True,
            )
    except Exception:
        pass

    # ── Attempt 2: verbose_json without timestamp_granularities ─────────────
    try:
        with open(tmp_path, "rb") as f:
            resp = await client.audio.transcriptions.create(
                file=(filename, f),
                model="whisper-large-v3",
                response_format="verbose_json",
                language="en",
            )

        segments = getattr(resp, "segments", None) or []
        duration = float(getattr(resp, "duration", 0) or 0)

        if segments:
            timestamped = _build_timestamped_transcript(segments)
            return TranscriptionOutput(
                text=timestamped,
                duration_seconds=duration,
                has_timestamps=bool(timestamped),
            )

        plain = (getattr(resp, "text", None) or "").strip()
        if plain:
            return TranscriptionOutput(text=plain, duration_seconds=duration, has_timestamps=False)
    except Exception:
        pass

    # ── Attempt 3: plain text (no timestamps at all) ─────────────────────────
    try:
        with open(tmp_path, "rb") as f:
            resp = await client.audio.transcriptions.create(
                file=(filename, f),
                model="whisper-large-v3",
                response_format="text",
                language="en",
            )
        transcript = resp if isinstance(resp, str) else (getattr(resp, "text", "") or "")
        return TranscriptionOutput(text=transcript, duration_seconds=0.0, has_timestamps=False)
    except Exception as exc:
        return TranscriptionOutput(
            text=(
                f"[Audio file: {filename}. Transcription failed: {exc}. "
                "Please extract any tasks you can infer from the meeting title.]"
            ),
            duration_seconds=0.0,
            has_timestamps=False,
        )
