import os
import json
import logging
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types

from app.core.config import settings
from app.models.meeting import Meeting
from app.models.action_item import ActionItem
from app.models.decision import Decision
from app.services.prompts import (
    FOLLOW_UP_EMAIL_SYSTEM_PROMPT,
    get_follow_up_email_user_prompt,
    get_follow_up_email_retry_prompt,
)
from app.services.summarization import (
    call_gemini_with_rate_limit_retry,
    extract_json_str,
    GeminiRateLimitError,
)

logger = logging.getLogger(__name__)


def format_action_items_for_email(action_items: List[ActionItem]) -> str:
    if not action_items:
        return "No action items recorded for this meeting."
    lines = []
    for ai in action_items:
        owner = ai.assigned_to or "Unassigned"
        deadline = ai.deadline_text or "No deadline specified"
        lines.append(f"- Task: {ai.task} | Owner: {owner} | Deadline: {deadline} (Status: {ai.status})")
    return "\n".join(lines)


def format_decisions_for_email(decisions: List[Decision]) -> str:
    if not decisions:
        return "No decisions recorded for this meeting."
    return "\n".join(f"- {d.decision}" for d in decisions if d.decision)


def generate_follow_up_email(
    meeting: Meeting,
    action_items: List[ActionItem],
    decisions: List[Decision],
    tone: str = "friendly",
) -> Dict[str, str]:
    """
    Generates a follow-up email draft (subject and body) using Google Gemini.
    Retries up to 3 times on HTTP 429 rate limits, and performs 1 retry if JSON parsing fails.
    """
    api_key = (settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")).strip()
    if not api_key or api_key == "your-gemini-api-key-here":
        raise ValueError(
            "GEMINI_API_KEY is not configured in backend/.env. Please configure a valid Gemini API key."
        )

    model_name = (settings.GEMINI_MODEL or os.environ.get("GEMINI_MODEL", "")).strip() or "gemini-3.5-flash-lite"
    client = genai.Client(api_key=api_key)

    action_items_text = format_action_items_for_email(action_items)
    decisions_text = format_decisions_for_email(decisions)

    user_prompt = get_follow_up_email_user_prompt(
        meeting_title=meeting.title,
        summary=meeting.summary or "",
        action_items_text=action_items_text,
        decisions_text=decisions_text,
        tone=tone,
    )

    config = types.GenerateContentConfig(
        system_instruction=FOLLOW_UP_EMAIL_SYSTEM_PROMPT,
        response_mime_type="application/json",
        temperature=0.3,
    )

    logger.info(f"Generating follow-up email with tone='{tone}' using {model_name}...")

    # Attempt 1
    response = call_gemini_with_rate_limit_retry(
        client=client,
        model=model_name,
        contents=user_prompt,
        config=config,
        max_retries=3,
        initial_delay=2.0,
    )

    raw_text = response.text or ""
    try:
        cleaned_json = extract_json_str(raw_text)
        data = json.loads(cleaned_json)
        if isinstance(data, dict) and "subject" in data and "body" in data:
            return {
                "subject": str(data["subject"]).strip(),
                "body": str(data["body"]).strip(),
            }
        raise ValueError(f"Missing required fields 'subject' or 'body' in LLM response: {data}")
    except (json.JSONDecodeError, ValueError) as err:
        logger.warning(f"Email generation attempt 1 failed validation ({err}). Retrying once with feedback...")

        # Retry once with feedback
        retry_prompt = get_follow_up_email_retry_prompt(str(err), raw_text)
        retry_response = call_gemini_with_rate_limit_retry(
            client=client,
            model=model_name,
            contents=[user_prompt, raw_text, retry_prompt],
            config=config,
            max_retries=3,
            initial_delay=2.0,
        )

        cleaned_retry = extract_json_str(retry_response.text or "")
        try:
            retry_data = json.loads(cleaned_retry)
            if isinstance(retry_data, dict) and "subject" in retry_data and "body" in retry_data:
                return {
                    "subject": str(retry_data["subject"]).strip(),
                    "body": str(retry_data["body"]).strip(),
                }
        except Exception:
            pass

        # Fallback if model still failed strict JSON schema
        fallback_subject = f"Meeting Recap: {meeting.title}"
        fallback_body = (
            f"Hi team,\n\n"
            f"Here is a quick recap of our meeting: {meeting.title}.\n\n"
            f"{meeting.summary or ''}\n\n"
            f"Action Items:\n{action_items_text}\n\n"
            f"Best regards,\nYour Team"
        )
        return {"subject": fallback_subject, "body": fallback_body}
