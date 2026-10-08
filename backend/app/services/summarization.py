import os
import json
import logging
from typing import Any, Dict, Tuple
from openai import OpenAI

from app.core.config import settings
from app.services.prompts import (
    ANALYSIS_SYSTEM_PROMPT,
    get_analysis_user_prompt,
    get_analysis_retry_prompt,
)

logger = logging.getLogger(__name__)


def extract_json_str(raw: str) -> str:
    """
    Cleans response string, removing potential markdown code block markers.
    """
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()
    return cleaned


def validate_analysis_payload(payload: Any) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Validates that payload has summary, key_points, action_items, and decisions.
    Returns (is_valid, error_message, validated_dict).
    """
    if not isinstance(payload, dict):
        return False, "Response must be a JSON object.", {}

    # 1. Summary
    summary = payload.get("summary")
    if not isinstance(summary, str) or not summary.strip():
        return False, "Field 'summary' must be a non-empty string.", {}

    # 2. Key Points
    key_points = payload.get("key_points")
    if not isinstance(key_points, list):
        return False, "Field 'key_points' must be a JSON array of strings.", {}

    cleaned_points = [str(item).strip() for item in key_points if str(item).strip()]
    if not cleaned_points:
        return False, "Field 'key_points' must contain at least one point.", {}

    # 3. Action Items
    action_items_raw = payload.get("action_items")
    if action_items_raw is None:
        action_items_raw = []
    if not isinstance(action_items_raw, list):
        return False, "Field 'action_items' must be a JSON array of objects.", {}

    cleaned_action_items = []
    for idx, item in enumerate(action_items_raw):
        if not isinstance(item, dict):
            return False, f"Action item #{idx + 1} must be an object with task, assigned_to, and deadline_text.", {}
        task = item.get("task")
        if not isinstance(task, str) or not task.strip():
            return False, f"Action item #{idx + 1} must have a non-empty 'task' description.", {}

        assigned_to = item.get("assigned_to")
        if assigned_to is not None:
            assigned_to = str(assigned_to).strip()
            if not assigned_to or assigned_to.lower() in ("null", "none", "unassigned"):
                assigned_to = None

        deadline_text = item.get("deadline_text")
        if deadline_text is not None:
            deadline_text = str(deadline_text).strip()
            if not deadline_text or deadline_text.lower() in ("null", "none"):
                deadline_text = None

        cleaned_action_items.append({
            "task": task.strip(),
            "assigned_to": assigned_to,
            "deadline_text": deadline_text,
        })

    # 4. Decisions
    decisions_raw = payload.get("decisions")
    if decisions_raw is None:
        decisions_raw = []
    if not isinstance(decisions_raw, list):
        return False, "Field 'decisions' must be a JSON array of strings.", {}

    cleaned_decisions = [str(d).strip() for d in decisions_raw if str(d).strip()]

    return True, "", {
        "summary": summary.strip(),
        "key_points": cleaned_points,
        "action_items": cleaned_action_items,
        "decisions": cleaned_decisions,
    }


# Backwards compatibility alias
validate_summary_payload = validate_analysis_payload


def analyze_meeting_transcript(transcript_text: str, meeting_date_str: str = "") -> Dict[str, Any]:
    """
    Calls OpenAI chat API (gpt-4o-mini) to extract summary, key points, action items,
    and decisions in ONE single structured JSON call.
    Validates structure and retries once if invalid.
    """
    api_key = (settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY", "")).strip()
    if not api_key or api_key == "your-openai-api-key-here":
        raise ValueError("OPENAI_API_KEY is not configured in backend/.env. Please configure a valid OpenAI API key.")

    client = OpenAI(api_key=api_key)

    messages = [
        {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
        {"role": "user", "content": get_analysis_user_prompt(transcript_text, meeting_date_str)},
    ]

    logger.info("Calling OpenAI gpt-4o-mini for full meeting intelligence analysis...")
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    raw_content = response.choices[0].message.content or ""

    try:
        parsed = json.loads(extract_json_str(raw_content))
        valid, err_msg, validated_data = validate_analysis_payload(parsed)
        if valid:
            logger.info("Meeting analysis parsed and validated successfully on initial attempt.")
            return validated_data
    except Exception as e:
        err_msg = f"JSON decoding error: {e}"

    # Retrying once with error feedback
    logger.warning(f"Analysis response failed validation: {err_msg}. Retrying once with error feedback...")
    messages.append({"role": "assistant", "content": raw_content})
    messages.append({"role": "user", "content": get_analysis_retry_prompt(err_msg, raw_content)})

    retry_response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.3,
    )
    retry_raw = retry_response.choices[0].message.content or ""

    try:
        retry_parsed = json.loads(extract_json_str(retry_raw))
        valid, retry_err, validated_data = validate_analysis_payload(retry_parsed)
        if not valid:
            raise ValueError(f"Analysis retry validation failed: {retry_err}")
        logger.info("Meeting analysis parsed and validated successfully on retry.")
        return validated_data
    except Exception as e:
        logger.error(f"Failed to obtain valid analysis after retry: {e}")
        raise ValueError(f"Analysis generation failed after retry: {e}")


def generate_meeting_summary(transcript_text: str, meeting_date_str: str = "") -> Dict[str, Any]:
    """Compatibility wrapper calling analyze_meeting_transcript."""
    return analyze_meeting_transcript(transcript_text, meeting_date_str)
