import re
from typing import List, Optional
from app.models.meeting import Meeting
from app.models.transcript import TranscriptSegment
from app.models.action_item import ActionItem
from app.models.decision import Decision
from app.services.chat import format_timestamp


def sanitize_export_filename(title: str, meeting_id: int) -> str:
    """
    Creates a safe filename composed ONLY of letters, numbers, and dashes with a .md extension.
    Example: 'Sprint Review #4 (Q3)' -> 'Sprint-Review-4-Q3.md'
    """
    # Replace any character that is not a letter or number with a dash
    cleaned = re.sub(r'[^a-zA-Z0-9]+', '-', title).strip('-')
    if not cleaned:
        cleaned = f"meeting-{meeting_id}"
    return f"{cleaned}.md"


def generate_meeting_markdown(
    meeting: Meeting,
    segments: List[TranscriptSegment],
    action_items: List[ActionItem],
    decisions: List[Decision],
) -> str:
    """
    Assembles complete Markdown document containing meeting title, date, summary,
    key points, action items (checklist with assignee and deadline), decisions,
    and the full transcript with timestamps and speaker labels.
    """
    parts = []

    # Title
    parts.append(f"# {meeting.title.strip()}\n")

    # Date
    date_str = meeting.created_at.strftime("%Y-%m-%d %H:%M:%S UTC") if meeting.created_at else "Unknown date"
    parts.append(f"**Date:** {date_str}  \n**Status:** {meeting.status.capitalize()}\n")

    parts.append("---\n")

    # Executive Summary
    parts.append("## Executive Summary\n")
    if meeting.summary and meeting.summary.strip():
        parts.append(f"{meeting.summary.strip()}\n")
    else:
        parts.append("_No executive summary available._\n")

    parts.append("---\n")

    # Key Points
    parts.append("## Key Points\n")
    if meeting.key_points and isinstance(meeting.key_points, list):
        kp_items = [str(kp).strip() for kp in meeting.key_points if str(kp).strip()]
        if kp_items:
            for kp in kp_items:
                parts.append(f"- {kp}")
            parts.append("")
        else:
            parts.append("_No key points recorded._\n")
    else:
        parts.append("_No key points recorded._\n")

    parts.append("---\n")

    # Action Items (as a checklist with assignee and deadline)
    parts.append("## Action Items\n")
    if action_items:
        for ai in action_items:
            check = "[x]" if ai.status == "completed" else "[ ]"
            assignee = ai.assigned_to.strip() if ai.assigned_to and ai.assigned_to.strip() else "Unassigned"
            deadline = ai.deadline_text.strip() if ai.deadline_text and ai.deadline_text.strip() else "No deadline"
            parts.append(f"- {check} {ai.task.strip()} (Assignee: {assignee}, Deadline: {deadline})")
        parts.append("")
    else:
        parts.append("_No action items recorded._\n")

    parts.append("---\n")

    # Decisions
    parts.append("## Key Decisions\n")
    if decisions:
        dec_list = [d.decision.strip() for d in decisions if d.decision and d.decision.strip()]
        if dec_list:
            for dec in dec_list:
                parts.append(f"- {dec}")
            parts.append("")
        else:
            parts.append("_No decisions recorded._\n")
    else:
        parts.append("_No decisions recorded._\n")

    parts.append("---\n")

    # Full Transcript with timestamps and speaker names when set
    parts.append("## Transcript\n")
    if segments:
        for seg in segments:
            ts = format_timestamp(seg.start_time)
            speaker_prefix = f" {seg.speaker.strip()}:" if seg.speaker and seg.speaker.strip() else ""
            line = f"{ts}{speaker_prefix} {seg.text.strip()}"
            parts.append(line)
        parts.append("")
    else:
        parts.append("_No transcript segments recorded._\n")

    return "\n".join(parts)
