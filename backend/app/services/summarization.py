import os
import json
import logging
from typing import Any, Dict, Tuple
from openai import OpenAI

from app.core.config import settings
from app.services.prompts import (
    SUMMARY_SYSTEM_PROMPT,
    get_summary_user_prompt,
    get_summary_retry_prompt,
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


def validate_summary_payload(payload: Any) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Validates that payload has 'summary' (str) and 'key_points' (list of strings).
    Returns (is_valid, error_message, validated_dict).
    """
    if not isinstance(payload, dict):
        return False, "Response must be a JSON object.", {}

    summary = payload.get("summary")
    if not isinstance(summary, str) or not summary.strip():
        return False, "Field 'summary' must be a non-empty string.", {}

    key_points = payload.get("key_points")
    if not isinstance(key_points, list):
        return False, "Field 'key_points' must be a JSON array of strings.", {}

    cleaned_points = [str(item).strip() for item in key_points if str(item).strip()]
    if not cleaned_points:
        return False, "Field 'key_points' must contain at least one point.", {}

    return True, "", {
        "summary": summary.strip(),
        "key_points": cleaned_points,
    }


def generate_meeting_summary(transcript_text: str) -> Dict[str, Any]:
    """
    Calls OpenAI chat API (gpt-4o-mini) to generate a short summary (2-4 sentences)
    and 3-7 key points in strict JSON format.
    Validates the structure and retries once if invalid.
    """
    api_key = (settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY", "")).strip()
    if not api_key or api_key == "your-openai-api-key-here":
        raise ValueError("OPENAI_API_KEY is not configured in backend/.env. Please configure a valid OpenAI API key.")

    client = OpenAI(api_key=api_key)

    messages = [
        {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
        {"role": "user", "content": get_summary_user_prompt(transcript_text)},
    ]

    logger.info("Calling OpenAI gpt-4o-mini for meeting summary...")
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    raw_content = response.choices[0].message.content or ""

    try:
        parsed = json.loads(extract_json_str(raw_content))
        valid, err_msg, validated_data = validate_summary_payload(parsed)
        if valid:
            logger.info("Meeting summary parsed and validated successfully on initial attempt.")
            return validated_data
    except Exception as e:
        err_msg = f"JSON decoding error: {e}"

    # Retrying once with error feedback
    logger.warning(f"Summary response failed validation: {err_msg}. Retrying once with error feedback...")
    messages.append({"role": "assistant", "content": raw_content})
    messages.append({"role": "user", "content": get_summary_retry_prompt(err_msg, raw_content)})

    retry_response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.3,
    )
    retry_raw = retry_response.choices[0].message.content or ""

    try:
        retry_parsed = json.loads(extract_json_str(retry_raw))
        valid, retry_err, validated_data = validate_summary_payload(retry_parsed)
        if not valid:
            raise ValueError(f"Summary retry validation failed: {retry_err}")
        logger.info("Meeting summary parsed and validated successfully on retry.")
        return validated_data
    except Exception as e:
        logger.error(f"Failed to obtain valid summary after retry: {e}")
        raise ValueError(f"Summary generation failed after retry: {e}")
