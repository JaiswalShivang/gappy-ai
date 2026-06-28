"""
functions/parse_bracket_timestamp.fn.py
=========================================
Lemma Function: parse_bracket_timestamp

Replaces: _parse_bracket_timestamp() in ai_service.py
          _sanitise_seconds() in audio_service.py

Converts a [HH:MM:SS] or [MM:SS] timestamp bracket string to integer seconds.
Used by the mock_extract_tasks fallback and optionally as a tool for the
meeting_analyst agent for self-verification of extracted timestamps.

Input:
  bracket (str) — e.g. "[00:01:10]", "[02:45]", "00:01:10", "70"

Output:
  int — integer seconds (e.g. 70), or -1 on parse failure

Examples:
  "[00:01:10]"  → 70
  "[02:45]"     → 165
  "00:01:10"    → 70
  "garbage"     → -1

Exposed to agents: optionally meeting_analyst (as verification tool)
"""

from lemma import fn


@fn(
    name="parse_bracket_timestamp",
    description=(
        "Convert a [HH:MM:SS] or [MM:SS] timestamp bracket string to integer seconds. "
        "Returns -1 if the format cannot be parsed. "
        "Handles brackets with or without the surrounding [] characters."
    ),
)
def parse_bracket_timestamp(bracket: str) -> int:
    """
    Parse a timestamp bracket to integer seconds.

    Supports:
      - "[HH:MM:SS]" format (most common from Whisper output)
      - "[MM:SS]" format (short meetings)
      - Bare "HH:MM:SS" without brackets (lenient parsing)
      - Plain integer strings like "70" (pass-through)
    """
    if not bracket:
        return -1

    raw = str(bracket).strip().strip("[]").strip()

    if not raw:
        return -1

    parts = raw.split(":")

    try:
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        if len(parts) == 1:
            # Plain integer — treat as seconds directly
            return max(int(raw), 0)
    except ValueError:
        pass

    return -1
