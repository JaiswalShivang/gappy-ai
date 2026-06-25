"""
services/audio_service.py — Non-Blocking Audio Proof Slicer
===========================================================
Primary: Uses FFmpeg (via ffmpeg-python) to cut audio clips.
Fallback: If FFmpeg is not installed, returns a URL pointing to
          the full audio file with an HTML5 Media Fragment
          (e.g. /uploads/audio/<file>.mp3#t=30,90) so the browser
          still seeks to the right timestamp.
"""

import asyncio
import logging
import shutil
from pathlib import Path

logger = logging.getLogger(__name__)

AUDIO_PROOF_DIR = Path("uploads") / "audio_proofs"
AUDIO_PROOF_DIR.mkdir(parents=True, exist_ok=True)

# ── FFmpeg availability check (cached at module load time) ─────────────────────
_FFMPEG_AVAILABLE: bool = shutil.which("ffmpeg") is not None
if _FFMPEG_AVAILABLE:
    try:
        import ffmpeg as _ffmpeg  # noqa: F401
        logger.info("FFmpeg found — audio proofs will be cut clips.")
    except ImportError:
        _FFMPEG_AVAILABLE = False
        logger.warning("ffmpeg-python not installed — using media-fragment fallback.")
else:
    logger.warning(
        "FFmpeg binary not found in PATH — audio proofs will use HTML5 Media Fragment URLs."
    )


def _sanitise_seconds(value) -> int:
    """
    Coerce a timestamp value to a clean integer number of seconds.
    Handles:
      - plain ints / floats
      - strings like '70', ' 70 ', or '[00:01:10]' that slipped through
    Returns 0 on any parse failure so FFmpeg never receives garbage input.
    """
    if isinstance(value, (int, float)):
        return max(int(value), 0)
    raw = str(value).strip().strip("[]").strip()
    parts = raw.split(":")
    try:
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        return max(int(raw), 0)
    except (ValueError, TypeError):
        logger.warning("_sanitise_seconds: could not parse %r — defaulting to 0", value)
        return 0


def _cut_sync(src: str, start: int, end: int, out: str) -> None:
    """Blocking FFmpeg call — run inside asyncio.to_thread only."""
    import ffmpeg
    start = _sanitise_seconds(start)
    end = _sanitise_seconds(end)
    duration = max(end - start, 1)
    (
        ffmpeg
        .input(src, ss=start, t=duration)
        .output(out, acodec="copy")
        .overwrite_output()
        .run(quiet=True)
    )


async def generate_audio_proof(
    src_path: str,
    start_seconds: int,
    end_seconds: int,
    task_id: str,
) -> str | None:
    """
    Generate an audio proof clip for a task.

    Strategy:
    1. If FFmpeg is available → cut a proper clip → /uploads/audio_proofs/<id>.<ext>
    2. If FFmpeg is unavailable → return a Media Fragment URL pointing to the
       original audio file → /uploads/audio/<file>.mp3#t=<start>,<end>

    Returns None only if start >= end AND no src_path is available.
    """
    start_seconds = _sanitise_seconds(start_seconds)
    end_seconds = _sanitise_seconds(end_seconds)

    if start_seconds >= end_seconds:
        logger.debug("Skipping audio proof for %s — start >= end", task_id)
        return None

    if _FFMPEG_AVAILABLE:
        ext = Path(src_path).suffix or ".mp3"
        out_path = str(AUDIO_PROOF_DIR / f"{task_id}{ext}")
        try:
            await asyncio.to_thread(_cut_sync, src_path, start_seconds, end_seconds, out_path)
            url = f"/uploads/audio_proofs/{task_id}{ext}"
            logger.info("Audio proof clip ready: %s", url)
            return url
        except Exception as exc:
            logger.error("FFmpeg cut failed for task %s: %s — falling back to fragment URL", task_id, exc)
            # Fall through to fragment URL fallback

    # ── Media Fragment fallback ──────────────────────────────────────────────
    # HTML5 <audio src="/uploads/audio/file.mp3#t=30,90"> tells the browser
    # to seek to 30s and stop at 90s — no server-side cutting needed.
    src_filename = Path(src_path).name
    fragment_url = f"/uploads/audio/{src_filename}#t={start_seconds},{end_seconds}"
    logger.info("Audio proof (media fragment): %s", fragment_url)
    return fragment_url
