"""
services/ai_service.py — Isolated AI Adapter  (Groq / Llama 3)
===============================================================

┌──────────────────────────────────────────────────────────────────┐
│  TODO (2026-06-24): REPLACE THIS ENTIRE FILE WITH THE LEMMA SDK  │
│                                                                  │
│  Public interface to preserve (zero changes elsewhere):          │
│    async def extract_meeting_data(transcript, title) -> dict     │
│                                                                  │
│  Return shape (STABLE — do not rename keys):                     │
│    {                                                             │
│      "summary": str,                                             │
│      "participants": List[str],                                  │
│      "key_points": List[str],                                    │
│      "duration": int,          # seconds                         │
│      "tasks": [                                                  │
│        {                                                         │
│          "title": str,                                           │
│          "description": str,                                     │
│          "assignee": str,                                        │
│          "priority": "High"|"Medium"|"Low",                      │
│          "sourceQuote": str,                                      │
│          "startTime": int,     # seconds offset                  │
│          "endTime":   int,     # seconds offset                  │
│        }, ...                                                    │
│      ],                                                          │
│    }                                                             │
└──────────────────────────────────────────────────────────────────┘
"""

import json
import logging
import re
from openai import AsyncOpenAI
from core.config import settings

logger = logging.getLogger(__name__)

# TODO (2026-06-24): Remove this client when swapping to Lemma SDK.
_client = AsyncOpenAI(
    base_url=settings.groq_base_url,
    api_key=settings.groq_api_key,
)

_SYSTEM_PROMPT = """
You are an expert meeting analyst. Output ONLY a single valid JSON object.
Do NOT include markdown fences, comments, or text outside the JSON.

━━━ TRANSCRIPT FORMAT ━━━
The transcript is TIMESTAMPED. Every line or segment begins with a bracket:
  [HH:MM:SS]  e.g. [00:12:35]
  [MM:SS]     e.g. [02:45]

The transcript may be one of two types — handle both correctly:

TYPE A — Speaker-labelled (manually written or diarized):
  [00:01:10] Chair: We need John to connect with the guidance counsellor.

TYPE B — Raw Whisper output (no speaker labels, continuous speech):
  [00:01:10] We need to connect John with the guidance counsellor.
  [00:01:45] Maria will send the budget report by Thursday.

━━━ TIMESTAMP RULE (NON-NEGOTIABLE) ━━━
CRITICAL: You MUST extract startTime and endTime from the [HH:MM:SS] bracket
on the line where the task is mentioned. Convert to integer seconds:
  [00:01:10] → 70 seconds
  [02:45]    → 165 seconds
NEVER invent, estimate, or guess timestamps. If a task spans multiple lines,
startTime = first line's bracket, endTime = last relevant line's bracket.
If truly no bracket exists near the task, output startTime: -1, endTime: -1.

━━━ ASSIGNEE RULE ━━━
Look for the PERSON RESPONSIBLE for doing the task — not the subject of it.
  - "John will fix the server"            → assignee: "John"
  - "Maria needs to send the report"      → assignee: "Maria"
  - "We need to refer John to a counsellor" → the task is about John, but who
    will do it? Look for context. If unclear: "Unassigned"
  - "Can Sarah handle the venue booking?" → assignee: "Sarah"
  - "Tom, please set up the projector"    → assignee: "Tom"

━━━ REQUIRED JSON SCHEMA ━━━
{
  "summary": "<3-5 sentence meeting summary>",
  "participants": ["<Full Name>", ...],
  "key_points": ["<key insight or decision>", ...],
  "duration": <integer seconds — from the LAST timestamp bracket in transcript>,
  "tasks": [
    {
      "title": "<short imperative task title, max 8 words>",
      "description": "<detailed actionable description>",
      "assignee": "<Full name or 'Unassigned'>",
      "priority": "<High|Medium|Low>",
      "sourceQuote": "<verbatim line(s) from transcript including the [HH:MM:SS] bracket>",
      "startTime": <integer seconds from bracket — NEVER invented>,
      "endTime": <integer seconds from bracket — NEVER invented>
    }
  ]
}

━━━ RULES ━━━
- Extract EVERY explicitly assigned actionable task. Skip general statements.
- priority=High if urgent/deadline mentioned, Low if vague, else Medium.
- sourceQuote MUST include the original [HH:MM:SS] bracket.
- startTime and endTime MUST come from brackets. Do NOT guess.
- Respond with ONLY the JSON object. No markdown. No prose.
"""


def _parse_bracket_timestamp(bracket: str) -> int:
    """
    Convert a [HH:MM:SS] or [MM:SS] bracket string to integer seconds.
    Returns -1 if the format cannot be parsed.
    """
    raw = bracket.strip().strip('[]').strip()
    parts = raw.split(':')
    try:
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
    except ValueError:
        pass
    return -1


def _mock_response(transcript: str, title: str) -> dict:
    """
    Fallback used when Groq is unavailable.
    Parses timestamped lines ([HH:MM:SS] / [MM:SS]) first, then falls back
    to simple 'Name will do X' / 'Name: do X' regex patterns.
    Guarantees the frontend always gets a usable response during development.
    """
    logger.warning("Groq unavailable — using mock extraction fallback.")

    # ── Split transcript into timestamped lines ──────────────────────────────
    # Each line may start with [HH:MM:SS] or [MM:SS]
    ts_line_re = re.compile(r'^(\[\d{1,2}:\d{2}(?::\d{2})?\])\s*(.*)$')
    lines = transcript.splitlines()
    parsed_lines = []  # list of (start_seconds: int, text: str)
    for line in lines:
        m = ts_line_re.match(line.strip())
        if m:
            secs = _parse_bracket_timestamp(m.group(1))
            parsed_lines.append((secs, line.strip()))
        elif line.strip():
            parsed_lines.append((-1, line.strip()))

    task_patterns = [
        # Primary: explicit modal verbs — "John will fix", "Maria needs to send"
        r'(\b[A-Z][a-z]+\b)\s+(?:will|should|must|needs? to|has to|is going to|please)\s+(.+)',
        # Secondary: arrow assignment — "John → fix the DB"
        r'(\b[A-Z][a-z]+\b)\s*→\s*(.+)',
        # Tertiary: "assign/ask/tell John to ..."
        r'(?:assign|ask|tell|can)\s+(\b[A-Z][a-z]+\b)\s+to\s+(.+)',
        # Quaternary: indirect assignment — "John, please handle that" / "John, do X"
        r'(\b[A-Z][a-z]+\b),\s+(?:please\s+)?(.+)',
    ]
    # NOTE: We intentionally exclude the "Name: text" colon pattern because in a
    # timestamped transcript every speaker line looks like "Speaker: speech" and
    # would be wrongly extracted as a task assignment.

    tasks = []
    seen: set = set()

    # Walk timestamped lines and try to extract tasks
    for idx, (start_secs, line_text) in enumerate(parsed_lines):
        # Derive end time from the NEXT line's timestamp, or start + 20 s
        if idx + 1 < len(parsed_lines) and parsed_lines[idx + 1][0] >= 0:
            end_secs = parsed_lines[idx + 1][0]
        elif start_secs >= 0:
            end_secs = start_secs + 20
        else:
            end_secs = idx * 30 + 20

        if start_secs < 0:
            start_secs = idx * 30

        for pat in task_patterns:
            match = re.search(pat, line_text, re.IGNORECASE)
            if match:
                assignee = match.group(1).strip().title()
                action = match.group(2).strip().rstrip('.,!?')
                key = (assignee.lower(), action.lower()[:30])
                if key not in seen:
                    seen.add(key)
                    tasks.append({
                        "title": action[:60],
                        "description": f"{assignee} needs to: {action}",
                        "assignee": assignee,
                        "priority": "High" if any(
                            w in line_text.lower()
                            for w in ["urgent", "asap", "friday", "today", "deadline"]
                        ) else "Medium",
                        "sourceQuote": line_text,
                        "startTime": start_secs,
                        "endTime": end_secs,
                    })
                break

    if not tasks:
        tasks = [{
            "title": "Review meeting notes",
            "description": "No explicit task assignments detected. Please review the transcript manually.",
            "assignee": "Unassigned",
            "priority": "Low",
            "sourceQuote": transcript[:120],
            "startTime": 0,
            "endTime": 10,
        }]

    # Extract participant names (capitalised words appearing before a colon/arrow)
    participants = list({
        m.group(1)
        for m in re.finditer(r'\b([A-Z][a-z]{2,})\b(?:\s*[:→])', transcript)
    })

    # Estimate duration from last known timestamp
    last_ts = max((s for s, _ in parsed_lines if s >= 0), default=0)
    duration = max(last_ts + 60, max(len(transcript) // 15, 60))

    return {
        "summary": (
            f"Meeting titled '{title}'. {len(tasks)} action item(s) identified. "
            f"Participants: {', '.join(participants) if participants else 'Unknown'}."
        ),
        "participants": participants or ["Unknown"],
        "key_points": [f"Task assigned to {t['assignee']}: {t['title']}" for t in tasks[:3]],
        "duration": duration,
        "tasks": tasks,
    }


async def extract_meeting_data(transcript: str, title: str) -> dict:
    """
    Analyse a meeting transcript and return structured task data.
    Falls back to regex-based mock extraction if Groq is unreachable.

    # TODO (2026-06-24): Replace body with LemmaClient call.
    """
    logger.info("AI extraction: title=%r  len=%d chars", title, len(transcript))

    try:
        response = await _client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": f"Meeting Title: {title}\n\nTranscript:\n{transcript}"},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        raw = response.choices[0].message.content or "{}"
        logger.debug("Raw AI output: %s", raw)
        data = json.loads(raw)

    except Exception as exc:
        # Groq unreachable — use mock so the demo still works
        logger.warning("Groq call failed (%s). Falling back to mock extraction.", exc)
        return _mock_response(transcript, title)

    # Defensive defaults so callers never get KeyError
    data.setdefault("summary", "")
    data.setdefault("participants", [])
    data.setdefault("key_points", [])
    data.setdefault("duration", 0)
    data.setdefault("tasks", [])

    for i, task in enumerate(data["tasks"]):
        task.setdefault("title", f"Task {i+1}")
        task.setdefault("description", "")
        task.setdefault("assignee", "Unassigned")
        task.setdefault("priority", "Medium")
        task.setdefault("sourceQuote", "")
        task.setdefault("startTime", 0)
        task.setdefault("endTime", 0)

    logger.info("AI done: %d tasks extracted", len(data["tasks"]))
    return data
