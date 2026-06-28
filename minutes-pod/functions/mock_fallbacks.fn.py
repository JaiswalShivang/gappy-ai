"""
functions/mock_fallbacks.fn.py
================================
Lemma Functions:
  mock_extract_tasks(transcript, title)   -> dict  (meeting_analyst output schema)
  mock_email_template(meeting_data)       -> str   (email_drafter output schema)

Replaces:
  _mock_response()  in services/ai_service.py
  _mock_email()     in services/ai_service.py

These two functions are invoked by workflow on_error handlers when Groq LLM
is unreachable. They guarantee the frontend always gets a usable response
during development or outages.

mock_extract_tasks:
  Regex-based task extraction from timestamped transcripts.
  4-pattern priority hierarchy: modal verbs → arrow → assign verbs → comma-directive.
  Parses [HH:MM:SS]/[MM:SS] brackets for ground-truth timestamps.

mock_email_template:
  Template-based email drafter. Produces the same markdown structure as the
  email_drafter agent but without LLM creativity.

Exposed to agents: NONE — invoked by workflow orchestrator on_error handlers only.
"""

import re
from typing import List
from lemma import fn


# ── Task patterns in priority order ───────────────────────────────────────────
# NOTE: The colon pattern ("Name: text") is intentionally excluded because
# in a timestamped transcript every speaker line looks like "Speaker: speech"
# and would be wrongly extracted as a task assignment.
_TASK_PATTERNS = [
    # Primary: explicit modal verbs — "John will fix", "Maria needs to send"
    r'(\b[A-Z][a-z]+\b)\s+(?:will|should|must|needs? to|has to|is going to|please)\s+(.+)',
    # Secondary: arrow assignment — "John → fix the DB"
    r'(\b[A-Z][a-z]+\b)\s*→\s*(.+)',
    # Tertiary: "assign/ask/tell/can John to ..."
    r'(?:assign|ask|tell|can)\s+(\b[A-Z][a-z]+\b)\s+to\s+(.+)',
    # Quaternary: indirect — "John, please handle that" / "John, do X"
    r'(\b[A-Z][a-z]+\b),\s+(?:please\s+)?(.+)',
]

_URGENT_KEYWORDS = {"urgent", "asap", "friday", "today", "deadline", "immediately", "now"}
_TS_LINE_RE = re.compile(r'^(\[\d{1,2}:\d{2}(?::\d{2})?\])\s*(.*)$')


def _parse_bracket(bracket: str) -> int:
    """Internal timestamp parser — mirrors parse_bracket_timestamp function."""
    raw = bracket.strip().strip("[]").strip()
    parts = raw.split(":")
    try:
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
    except ValueError:
        pass
    return -1


@fn(
    name="mock_extract_tasks",
    description=(
        "Regex-based fallback meeting extractor. Used when the Groq LLM is unreachable. "
        "Parses timestamped [HH:MM:SS] transcript lines to extract task assignments "
        "using 4 regex patterns. Returns same schema as meeting_analyst agent output."
    ),
)
def mock_extract_tasks(transcript: str, title: str) -> dict:
    """
    Fallback used when Groq is unavailable.

    Parses timestamped lines first, then falls back to simple regex patterns.
    Guarantees the frontend always gets a usable response during development.
    """
    lines = transcript.splitlines()
    parsed_lines: List[tuple] = []  # list of (start_seconds: int, text: str)

    for line in lines:
        m = _TS_LINE_RE.match(line.strip())
        if m:
            secs = _parse_bracket(m.group(1))
            parsed_lines.append((secs, line.strip()))
        elif line.strip():
            parsed_lines.append((-1, line.strip()))

    tasks = []
    seen: set = set()

    for idx, (start_secs, line_text) in enumerate(parsed_lines):
        # Derive end time from next line's timestamp, or start + 20s
        if idx + 1 < len(parsed_lines) and parsed_lines[idx + 1][0] >= 0:
            end_secs = parsed_lines[idx + 1][0]
        elif start_secs >= 0:
            end_secs = start_secs + 20
        else:
            end_secs = idx * 30 + 20

        if start_secs < 0:
            start_secs = idx * 30

        for pat in _TASK_PATTERNS:
            match = re.search(pat, line_text, re.IGNORECASE)
            if match:
                assignee = match.group(1).strip().title()
                action = match.group(2).strip().rstrip(".,!?")
                key = (assignee.lower(), action.lower()[:30])
                if key not in seen:
                    seen.add(key)
                    is_urgent = any(w in line_text.lower() for w in _URGENT_KEYWORDS)
                    tasks.append({
                        "title": action[:60],
                        "description": f"{assignee} needs to: {action}",
                        "assignee": assignee,
                        "priority": "High" if is_urgent else "Medium",
                        "sourceQuote": line_text,
                        "startTime": start_secs,
                        "endTime": end_secs,
                    })
                break

    # No tasks found — return a placeholder
    if not tasks:
        tasks = [{
            "title": "Review meeting notes",
            "description": (
                "No explicit task assignments detected. "
                "Please review the transcript manually."
            ),
            "assignee": "Unassigned",
            "priority": "Low",
            "sourceQuote": transcript[:120],
            "startTime": 0,
            "endTime": 10,
        }]

    # Extract participant names (capitalised words before colon or arrow)
    participants = list({
        m.group(1)
        for m in re.finditer(r'\b([A-Z][a-z]{2,})\b(?:\s*[:→])', transcript)
    })

    # Estimate duration from last known timestamp
    last_ts = max((s for s, _ in parsed_lines if s >= 0), default=0)
    duration = max(last_ts + 60, len(transcript) // 15, 60)

    return {
        "summary": (
            f"Meeting titled '{title}'. {len(tasks)} action item(s) identified. "
            f"Participants: {', '.join(participants) if participants else 'Unknown'}."
        ),
        "participants": participants or ["Unknown"],
        "key_points": [
            f"Task assigned to {t['assignee']}: {t['title']}" for t in tasks[:3]
        ],
        "duration": duration,
        "tasks": tasks,
    }


@fn(
    name="mock_email_template",
    description=(
        "Template-based fallback email drafter. Used when the Groq LLM is unreachable. "
        "Produces the same markdown structure as the email_drafter agent output. "
        "Uses 'audioClipUri' field (Decision 3 — Pod file store URIs)."
    ),
)
def mock_email_template(meeting_data: dict) -> str:
    """
    Generate a plain-text markdown email without an LLM.
    Matches the output format expected by the email_drafter agent.
    """
    title = meeting_data.get("title", "Untitled Meeting")
    summary = meeting_data.get("summary", "Please see the meeting notes.")
    tasks = meeting_data.get("tasks", [])
    participants = meeting_data.get("participants", [])

    greeting_names = ", ".join(participants) if participants else "Team"

    lines = [
        f"**Subject: Action Items — {title}**",
        "",
        f"Hi {greeting_names},",
        "",
        "Thank you for attending today's meeting. Here is a brief summary and your action items.",
        "",
        f"**Summary:** {summary}",
        "",
        "---",
        "**Action Items**",
        "",
    ]

    for t in tasks:
        # Support both old "audioClipPath" and new "audioClipUri" field names
        clip = t.get("audioClipUri") or t.get("audioClipPath")
        proof = f"  [🎧 Listen to assignment]({clip})" if clip else ""
        lines.append(
            f"- **{t.get('assignee', 'Unassigned')}** — {t.get('title', 'Task')} "
            f"[{t.get('priority', 'Medium')} priority]{proof}"
        )

    lines += [
        "",
        "Please reach out if you have any questions.",
        "",
        "Best regards,",
        "Minutes AI Assistant",
    ]

    return "\n".join(lines)
