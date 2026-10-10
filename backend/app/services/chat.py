import os
import time
import logging
import threading
from collections import defaultdict
from typing import List, Tuple, Optional, Dict, Any
from google import genai
from google.genai import types

from app.core.config import settings
from app.models.meeting import Meeting
from app.models.transcript import TranscriptSegment
from app.models.action_item import ActionItem
from app.models.decision import Decision
from app.schemas.chat import ChatMessage
from app.services.prompts import (
    CHAT_SYSTEM_PROMPT,
    CROSS_MEETING_CHAT_SYSTEM_PROMPT,
    QUERY_REWRITE_SYSTEM_PROMPT,
    get_cross_meeting_chat_user_prompt,
)
from app.services.summarization import (
    call_gemini_with_rate_limit_retry,
    GeminiRateLimitError,
)

logger = logging.getLogger(__name__)

# Maximum character threshold for transcript in chat context
MAX_TRANSCRIPT_CHARS = 100_000


def format_timestamp(seconds: Optional[float]) -> str:
    """Formats seconds into [MM:SS] timestamp."""
    if seconds is None:
        return "[00:00]"
    total_secs = int(max(0, seconds))
    mins = total_secs // 60
    secs = total_secs % 60
    return f"[{mins:02d}:{secs:02d}]"


def truncate_transcript_from_middle(
    segments: List[TranscriptSegment],
    max_chars: int = MAX_TRANSCRIPT_CHARS,
) -> Tuple[str, bool]:
    """
    Formats transcript segments into '[MM:SS] text'.
    If total text exceeds max_chars, preserves the first half and last half
    and omits the middle, annotating the omission clearly.
    Returns (formatted_text, was_truncated).
    """
    lines = []
    for s in segments:
        if not s.text or not s.text.strip():
            continue
        ts = format_timestamp(s.start_time)
        speaker = s.speaker.strip() if getattr(s, "speaker", None) and s.speaker.strip() else None
        if speaker:
            lines.append(f"{ts} {speaker}: {s.text.strip()}")
        else:
            lines.append(f"{ts} {s.text.strip()}")

    if not lines:
        return "No transcript recorded for this meeting.", False

    full_text = "\n".join(lines)
    if len(full_text) <= max_chars:
        return full_text, False

    half_chars = max_chars // 2

    # Collect beginning lines
    start_lines = []
    current_len = 0
    start_idx = 0
    while start_idx < len(lines) and current_len + len(lines[start_idx]) < half_chars:
        start_lines.append(lines[start_idx])
        current_len += len(lines[start_idx]) + 1
        start_idx += 1

    # Collect ending lines
    end_lines = []
    current_len = 0
    end_idx = len(lines) - 1
    while end_idx > start_idx and current_len + len(lines[end_idx]) < half_chars:
        end_lines.append(lines[end_idx])
        current_len += len(lines[end_idx]) + 1
        end_idx -= 1
    end_lines.reverse()

    omitted_count = max(0, (end_idx - start_idx + 1))
    omitted_msg = f"\n... [Transcript truncated in the middle: {omitted_count} dialogue segments omitted due to length] ...\n"

    truncated_text = "\n".join(start_lines) + omitted_msg + "\n".join(end_lines)
    logger.info(
        f"Transcript truncated from middle: retained {len(start_lines)} start lines and "
        f"{len(end_lines)} end lines, omitting {omitted_count} middle lines."
    )
    return truncated_text, True


def build_meeting_context(
    meeting: Meeting,
    segments: List[TranscriptSegment],
    action_items: List[ActionItem],
    decisions: List[Decision],
) -> str:
    """
    Assembles complete meeting context including metadata, executive summary,
    key points, action items, decisions, and timestamped transcript.
    """
    parts = []
    parts.append(f"Meeting Title: {meeting.title}")
    if meeting.created_at:
        parts.append(f"Recorded Date: {meeting.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}")

    if meeting.summary:
        parts.append(f"\nExecutive Summary:\n{meeting.summary}")

    if meeting.key_points and isinstance(meeting.key_points, list):
        kp_lines = "\n".join(f"- {kp}" for kp in meeting.key_points if str(kp).strip())
        if kp_lines:
            parts.append(f"\nKey Points:\n{kp_lines}")

    if action_items:
        ai_lines = []
        for ai in action_items:
            assignee = ai.assigned_to or "Unassigned"
            deadline = ai.deadline_text or "No deadline"
            ai_lines.append(f"- {ai.task} (Assigned to: {assignee}, Deadline: {deadline}, Status: {ai.status})")
        parts.append(f"\nAction Items:\n" + "\n".join(ai_lines))

    if decisions:
        dec_lines = "\n".join(f"- {d.decision}" for d in decisions if d.decision)
        if dec_lines:
            parts.append(f"\nDecisions Logged:\n{dec_lines}")

    transcript_text, _ = truncate_transcript_from_middle(segments)
    parts.append(f"\nMeeting Transcript with Timestamps:\n{transcript_text}")

    return "\n".join(parts)


def ask_meeting_ai(
    meeting_context: str,
    question: str,
    history: Optional[List[ChatMessage]] = None,
) -> str:
    """
    Invokes Google Gemini with the meeting context and user question.
    Retries up to 3 times on HTTP 429 rate limits.
    """
    api_key = (settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")).strip()
    if not api_key or api_key == "your-gemini-api-key-here":
        raise ValueError("GEMINI_API_KEY is not configured in backend/.env. Please configure a valid Gemini API key.")

    model_name = (settings.GEMINI_MODEL or os.environ.get("GEMINI_MODEL", "")).strip() or "gemini-3.5-flash-lite"
    client = genai.Client(api_key=api_key)

    system_instruction = (
        f"{CHAT_SYSTEM_PROMPT}\n\n"
        f"=== MEETING CONTEXT START ===\n"
        f"{meeting_context}\n"
        f"=== MEETING CONTEXT END ==="
    )

    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=0.2,
    )

    # Use max last 6 history messages
    recent_history = (history or [])[-6:]
    contents: List[types.Content] = []

    for msg in recent_history:
        gemini_role = "user" if msg.role == "user" else "model"
        text = msg.content.strip()
        if not text:
            continue
        if contents and contents[-1].role == gemini_role:
            # Merge with preceding message if role is identical
            contents[-1].parts.append(types.Part.from_text(text=text))
        else:
            contents.append(types.Content(role=gemini_role, parts=[types.Part.from_text(text=text)]))

    # Append the current question
    if contents and contents[-1].role == "user":
        contents[-1].parts.append(types.Part.from_text(text=question.strip()))
    else:
        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=question.strip())]))

    logger.info(f"Sending chat query to Gemini ({model_name}). Contents turns count: {len(contents)}")
    response = call_gemini_with_rate_limit_retry(
        client=client,
        model=model_name,
        contents=contents,
        config=config,
        max_retries=3,
        initial_delay=2.0,
    )

    answer = (response.text or "").strip()
    return answer or "That wasn't discussed in this meeting."


# -------------------------------------------------------------------------
# Cross-Meeting Rate Limiter & Helpers
# -------------------------------------------------------------------------

class InMemoryRateLimiter:
    """
    Thread-safe in-memory rate limiter per user ID.
    Enforces max requests within a sliding window (e.g., 20 requests per minute).
    """
    def __init__(self, max_requests: int = 20, window_seconds: float = 60.0):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.user_requests: Dict[int, List[float]] = defaultdict(list)
        self.lock = threading.Lock()

    def check_and_record(self, user_id: int) -> bool:
        now = time.time()
        with self.lock:
            valid_timestamps = [t for t in self.user_requests[user_id] if now - t < self.window_seconds]
            if len(valid_timestamps) >= self.max_requests:
                self.user_requests[user_id] = valid_timestamps
                return False
            valid_timestamps.append(now)
            self.user_requests[user_id] = valid_timestamps
            return True

    def reset_for_user(self, user_id: int):
        with self.lock:
            self.user_requests.pop(user_id, None)


chat_rate_limiter = InMemoryRateLimiter(max_requests=20, window_seconds=60.0)


def format_time_mm_ss(seconds: Optional[float]) -> str:
    """Formats seconds into MM:SS timestamp without brackets."""
    if seconds is None:
        return "00:00"
    total_secs = int(max(0, seconds))
    mins = total_secs // 60
    secs = total_secs % 60
    return f"{mins:02d}:{secs:02d}"


def format_chunks_for_cross_meeting_llm(chunks: List[Dict[str, Any]]) -> str:
    """
    Labels each chunk with meeting title, date, and start time:
    [Meeting: Sprint Review | 2026-10-04 | 03:25] text
    """
    lines = []
    for c in chunks:
        title = c.get("meeting_title") or "Untitled Meeting"
        dt = c.get("meeting_date")
        date_str = dt.strftime("%Y-%m-%d") if dt else "Undated"
        time_str = format_time_mm_ss(c.get("start_time", 0.0))
        text_content = (c.get("text") or "").strip()
        lines.append(f"[Meeting: {title} | {date_str} | {time_str}] {text_content}")
    return "\n\n".join(lines)


def rewrite_search_query_with_gemini(
    question: str,
    history: Optional[List[ChatMessage]] = None,
) -> str:
    """
    If conversation history exists, asks Gemini to rewrite the question
    as a clear, standalone search query. Falls back to original question on error.
    """
    if not history:
        return question.strip()

    recent_history = [m for m in history[-6:] if m.content.strip()]
    if not recent_history:
        return question.strip()

    api_key = (settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")).strip()
    if not api_key or api_key == "your-gemini-api-key-here":
        return question.strip()

    model_name = (settings.GEMINI_MODEL or os.environ.get("GEMINI_MODEL", "")).strip() or "gemini-3.5-flash-lite"
    client = genai.Client(api_key=api_key)

    formatted_history = []
    for msg in recent_history:
        role = "User" if msg.role == "user" else "Assistant"
        formatted_history.append(f"{role}: {msg.content.strip()}")

    history_str = "\n".join(formatted_history)

    prompt = (
        f"Conversation history:\n"
        f"{history_str}\n\n"
        f"Follow-up question:\n"
        f"{question.strip()}\n\n"
        f"Rewrite the follow-up question as a clear, standalone search query without pronouns or ambiguous references. "
        f"Output ONLY the rewritten search query text."
    )

    try:
        response = call_gemini_with_rate_limit_retry(
            client=client,
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=QUERY_REWRITE_SYSTEM_PROMPT,
                temperature=0.0,
                max_output_tokens=60,
            ),
            max_retries=2,
            initial_delay=1.0,
        )
        rewritten = (response.text or "").strip()
        if rewritten.startswith('"') and rewritten.endswith('"'):
            rewritten = rewritten[1:-1].strip()
        return rewritten or question.strip()
    except Exception as e:
        logger.warning(f"Query rewriting error (falling back to question): {e}")
        return question.strip()


def ask_cross_meeting_ai(
    context_chunks_text: str,
    question: str,
    history: Optional[List[ChatMessage]] = None,
) -> str:
    """
    Invokes Google Gemini with the formatted cross-meeting chunks and question.
    Strictly follows CROSS_MEETING_CHAT_SYSTEM_PROMPT.
    Retries up to 3 times on HTTP 429 rate limits.
    """
    api_key = (settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")).strip()
    if not api_key or api_key == "your-gemini-api-key-here":
        raise ValueError("GEMINI_API_KEY is not configured in backend/.env. Please configure a valid Gemini API key.")

    model_name = (settings.GEMINI_MODEL or os.environ.get("GEMINI_MODEL", "")).strip() or "gemini-3.5-flash-lite"
    client = genai.Client(api_key=api_key)

    config = types.GenerateContentConfig(
        system_instruction=CROSS_MEETING_CHAT_SYSTEM_PROMPT,
        temperature=0.2,
    )

    recent_history = (history or [])[-6:]
    contents: List[types.Content] = []

    for msg in recent_history:
        gemini_role = "user" if msg.role == "user" else "model"
        text = msg.content.strip()
        if not text:
            continue
        if contents and contents[-1].role == gemini_role:
            contents[-1].parts.append(types.Part.from_text(text=text))
        else:
            contents.append(types.Content(role=gemini_role, parts=[types.Part.from_text(text=text)]))

    user_prompt = get_cross_meeting_chat_user_prompt(context_chunks_text, question)

    if contents and contents[-1].role == "user":
        contents[-1].parts.append(types.Part.from_text(text=user_prompt))
    else:
        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_prompt)]))

    logger.info(f"Sending cross-meeting chat query to Gemini ({model_name}). Contents turns: {len(contents)}")
    response = call_gemini_with_rate_limit_retry(
        client=client,
        model=model_name,
        contents=contents,
        config=config,
        max_retries=3,
        initial_delay=2.0,
    )

    answer = (response.text or "").strip()
    return answer or "I couldn't find that in your meetings"
