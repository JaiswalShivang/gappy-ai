

import asyncio
import shutil
import tempfile
from pathlib import Path
from typing import Annotated

from lemma import fn, inject

_FFMPEG_AVAILABLE: bool = shutil.which("ffmpeg") is not None


def _sanitise_seconds(value) -> int:
    """
    Coerce any timestamp representation to a clean integer number of seconds.
    Handles int, float, strings like '70', '[00:01:10]'.
    Returns 0 on any parse failure so FFmpeg never receives garbage.
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
        return 0


def _cut_sync(src_local: str, start: int, end: int, out_local: str) -> None:
    """
    Blocking FFmpeg call — run inside asyncio.to_thread only.
    Copies audio codec to avoid re-encoding (fast, lossless).
    """
    import ffmpeg
    duration = max(end - start, 1)
    (
        ffmpeg
        .input(src_local, ss=start, t=duration)
        .output(out_local, acodec="copy")
        .overwrite_output()
        .run(quiet=True)
    )


@fn(
    name="generate_audio_proof",
    description=(
        "Cut an audio proof clip for a task's timespan from the source audio. "
        "Downloads from Pod file store, cuts with FFmpeg, re-uploads clip. "
        "Falls back to a Pod media-fragment URI if FFmpeg is unavailable."
    ),
)
async def generate_audio_proof(
    audio_file_uri: str,
    start_seconds: int,
    end_seconds: int,
    task_id: str,
    pod_files: Annotated[object, inject("pod.files")],
) -> str | None:
    """
    Generate an audio proof clip and store it in the Pod file store.

    Returns:
      pod://files/audio_proofs/<task_id><ext>   — FFmpeg cut (preferred)
      pod://files/audio/<src>#t=<s>,<e>         — media-fragment fallback
      None                                       — invalid time range
    """
    start_seconds = _sanitise_seconds(start_seconds)
    end_seconds = _sanitise_seconds(end_seconds)

    if start_seconds >= end_seconds:
        return None

    # Derive the extension from the source Pod URI
    src_filename = audio_file_uri.split("pod://files/audio/")[-1].split("#")[0]
    ext = Path(src_filename).suffix or ".mp3"
    clip_pod_uri = f"pod://files/audio_proofs/{task_id}{ext}"

    if _FFMPEG_AVAILABLE:
        try:
            # Download source audio from Pod file store
            audio_bytes = await pod_files.read(audio_file_uri)

            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as src_tmp:
                src_tmp.write(audio_bytes)
                src_local = src_tmp.name

            out_local = src_local + "_clip" + ext

            # Cut synchronously in thread pool (FFmpeg is blocking)
            await asyncio.to_thread(_cut_sync, src_local, start_seconds, end_seconds, out_local)

            # Upload the cut clip back to Pod file store
            with open(out_local, "rb") as clip_file:
                await pod_files.write(clip_pod_uri, clip_file.read())

            return clip_pod_uri

        except Exception:
            pass  # Fall through to media-fragment fallback

    # ── Media Fragment fallback ───────────────────────────────────────────────
    # HTML5 <audio src="pod://...#t=30,90"> tells the browser to seek to 30s
    # and stop at 90s without any server-side cutting needed.
    clean_source_uri = audio_file_uri.split("#")[0]  # strip any existing fragment
    return f"{clean_source_uri}#t={start_seconds},{end_seconds}"
