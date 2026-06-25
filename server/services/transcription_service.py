"""
services/transcription_service.py — Audio → Timestamped Text via Groq Whisper
===============================================================================

ARCHITECTURE (senior dev):
  Uses verbose_json to get real acoustic segment timestamps from Whisper.
  These are converted to [HH:MM:SS] bracket format so the LLM can read
  ground-truth timestamps instead of hallucinating them.

  Returns a TranscriptionResult dataclass containing both the formatted
  transcript string AND the audio duration in seconds — so the route handler
  can clamp LLM-returned timestamps to valid range.

  Fallback chain:
    1. verbose_json + timestamp_granularities=["segment"]  (real timestamps)
    2. verbose_json without granularities param            (Groq compatibility)
    3. plain text response_format="text"                   (no timestamps)
    4. Error string                                         (complete failure)
"""

import logging
from dataclasses import dataclass
from pathlib import Path
from groq import AsyncGroq
from core.config import settings

logger = logging.getLogger(__name__)

_groq = AsyncGroq(api_key=settings.groq_api_key)

# Groq Whisper supports: mp3, mp4, mpeg, mpga, m4a, wav, webm (max 25 MB)
SUPPORTED_EXTENSIONS = {".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm", ".ogg"}


@dataclass
class TranscriptionResult:
    """
    Carries both the transcript text and the actual audio duration.
    The duration is used by the route handler to clamp LLM timestamps.
    """
    text: str           # Timestamped transcript in [HH:MM:SS] format (or plain text)
    duration: float     # Total audio duration in seconds (0.0 if unknown)
    has_timestamps: bool  # True if [HH:MM:SS] brackets are present


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

    Input:  [{start: 5.1, end: 9.4, text: " John will fix the database."}, ...]
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


async def transcribe_audio(audio_path: str) -> TranscriptionResult:
    """
    Transcribe an audio file using Groq's whisper-large-v3.

    Returns a TranscriptionResult with:
      - text: [HH:MM:SS]-bracketed transcript (or plain text on fallback)
      - duration: actual audio length in seconds
      - has_timestamps: whether brackets are present

    Example output.text:
        [00:00:05] Let's organise a pancake breakfast for Friday.
        [00:00:15] We need to connect John with the guidance counsellor.
        [00:00:38] Maria will send the budget report by Thursday.
    """
    path = Path(audio_path)
    ext = path.suffix.lower()

    if ext not in SUPPORTED_EXTENSIONS:
        logger.warning("Unsupported audio extension %s — skipping transcription.", ext)
        return TranscriptionResult(
            text=f"[Audio file: {path.name}. Transcription skipped — unsupported format.]",
            duration=0.0,
            has_timestamps=False,
        )

    # ── Attempt 1: verbose_json with timestamp_granularities (best) ───────────
    try:
        logger.info("Transcribing %s — verbose_json + segment timestamps …", path.name)
        with open(audio_path, "rb") as f:
            resp = await _groq.audio.transcriptions.create(
                file=(path.name, f),
                model="whisper-large-v3",
                response_format="verbose_json",
                timestamp_granularities=["segment"],
                language="en",
            )

        segments = getattr(resp, "segments", None) or []
        duration = float(getattr(resp, "duration", 0) or 0)

        if segments:
            timestamped = _build_timestamped_transcript(segments)
            logger.info(
                "Transcription OK: %d segments, %.1fs duration, %d chars",
                len(segments), duration, len(timestamped),
            )
            return TranscriptionResult(
                text=timestamped,
                duration=duration,
                has_timestamps=True,
            )

        logger.warning("verbose_json returned 0 segments — trying without granularities.")

    except Exception as exc:
        logger.warning("verbose_json (with granularities) failed: %s", exc)

    # ── Attempt 2: verbose_json without timestamp_granularities param ─────────
    try:
        logger.info("Transcribing %s — verbose_json (no granularities) …", path.name)
        with open(audio_path, "rb") as f:
            resp = await _groq.audio.transcriptions.create(
                file=(path.name, f),
                model="whisper-large-v3",
                response_format="verbose_json",
                language="en",
            )

        segments = getattr(resp, "segments", None) or []
        duration = float(getattr(resp, "duration", 0) or 0)

        if segments:
            timestamped = _build_timestamped_transcript(segments)
            logger.info(
                "Transcription OK (no-gran): %d segments, %.1fs, %d chars",
                len(segments), duration, len(timestamped),
            )
            return TranscriptionResult(
                text=timestamped,
                duration=duration,
                has_timestamps=True,
            )

        # Has duration but no segments — grab plain text if available
        plain = (getattr(resp, "text", None) or "").strip()
        if plain:
            logger.warning("verbose_json returned no segments; using plain .text field.")
            return TranscriptionResult(text=plain, duration=duration, has_timestamps=False)

    except Exception as exc:
        logger.warning("verbose_json (no granularities) failed: %s", exc)

    # ── Attempt 3: plain text (no timestamps at all) ──────────────────────────
    try:
        logger.info("Transcribing %s — plain text fallback …", path.name)
        with open(audio_path, "rb") as f:
            resp = await _groq.audio.transcriptions.create(
                file=(path.name, f),
                model="whisper-large-v3",
                response_format="text",
                language="en",
            )
        transcript = resp if isinstance(resp, str) else (getattr(resp, "text", "") or "")
        logger.warning(
            "Plain text transcription succeeded but NO timestamps. "
            "Task timings will be estimated by the LLM and may be inaccurate."
        )
        return TranscriptionResult(text=transcript, duration=0.0, has_timestamps=False)

    except Exception as exc:
        logger.error("All transcription attempts failed: %s", exc)
        return TranscriptionResult(
            text=(
                f"[Audio file: {path.name}. Transcription failed: {exc}. "
                "Please extract any tasks you can infer from the meeting title.]"
            ),
            duration=0.0,
            has_timestamps=False,
        )
