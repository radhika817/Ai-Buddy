import os
import json
import time
import logging
from typing import Any, Dict, Tuple
from google import genai
from google.genai import types, errors

from app.core.config import settings
from app.services.prompts import (
    ANALYSIS_SYSTEM_PROMPT,
    get_analysis_user_prompt,
    get_analysis_retry_prompt,
)

logger = logging.getLogger(__name__)

MAX_RATE_LIMIT_RETRIES = 3
INITIAL_RATE_LIMIT_DELAY = 3.0  # seconds to wait before first retry


class GeminiRateLimitError(RuntimeError):
    """Raised when Gemini API rate limit (HTTP 429) is exceeded after all retry attempts."""
    pass


def is_rate_limit_error(exc: Exception) -> bool:
    """
    Detects if an exception corresponds to an HTTP 429 or RESOURCE_EXHAUSTED rate-limit error.
    """
    if isinstance(exc, errors.APIError):
        if getattr(exc, "code", None) == 429:
            return True
        msg = str(exc).upper()
        if "429" in msg or "RESOURCE_EXHAUSTED" in msg or "QUOTA" in msg:
            return True
    msg = str(exc).upper()
    return "429" in msg or "RESOURCE_EXHAUSTED" in msg or "RATE LIMIT" in msg or "QUOTA EXCEEDED" in msg


def call_gemini_with_rate_limit_retry(
    client: genai.Client,
    model: str,
    contents: Any,
    config: types.GenerateContentConfig,
    max_retries: int = MAX_RATE_LIMIT_RETRIES,
    initial_delay: float = INITIAL_RATE_LIMIT_DELAY,
) -> types.GenerateContentResponse:
    """
    Executes a Gemini generation call with automatic backoff retry on HTTP 429 rate limit errors.
    Retries up to `max_retries` times, waiting a few seconds between attempts.
    If all retries are exhausted, raises GeminiRateLimitError.
    """
    for attempt in range(max_retries + 1):
        try:
            return client.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )
        except Exception as exc:
            if is_rate_limit_error(exc):
                if attempt < max_retries:
                    wait_seconds = initial_delay * (attempt + 1)
                    logger.warning(
                        f"Gemini API rate limit (HTTP 429) encountered on attempt {attempt + 1}/{max_retries + 1}. "
                        f"Waiting {wait_seconds:.1f}s before retrying... Error: {exc}"
                    )
                    time.sleep(wait_seconds)
                    continue
                else:
                    logger.error(
                        f"Gemini API rate limit exceeded (HTTP 429) after {max_retries} retries: {exc}"
                    )
                    raise GeminiRateLimitError(
                        f"Gemini API rate limit reached (HTTP 429). The free-tier request quota was "
                        f"exceeded after {max_retries} retry attempts. Please wait a few moments and try again."
                    ) from exc
            # Non-rate-limit exceptions (auth, bad request, server errors) are re-raised immediately
            raise


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
    Calls Google Gemini Flash-Lite model to extract summary, key points, action items,
    and decisions in ONE single structured JSON call.
    Validates structure and retries once if invalid.
    Handles HTTP 429 rate limits by retrying up to 3 times before setting failure.
    """
    api_key = (settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")).strip()
    if not api_key or api_key == "your-gemini-api-key-here":
        raise ValueError("GEMINI_API_KEY is not configured in backend/.env. Please configure a valid Gemini API key.")

    model_name = (settings.GEMINI_MODEL or os.environ.get("GEMINI_MODEL", "")).strip() or "gemini-3.5-flash-lite"
    client = genai.Client(api_key=api_key)

    gen_config = types.GenerateContentConfig(
        system_instruction=ANALYSIS_SYSTEM_PROMPT,
        response_mime_type="application/json",
        temperature=0.3,
    )

    user_prompt = get_analysis_user_prompt(transcript_text, meeting_date_str)

    logger.info(f"Calling Google Gemini ({model_name}) for full meeting intelligence analysis...")
    response = call_gemini_with_rate_limit_retry(
        client=client,
        model=model_name,
        contents=user_prompt,
        config=gen_config,
    )

    raw_content = response.text or ""

    try:
        parsed = json.loads(extract_json_str(raw_content))
        valid, err_msg, validated_data = validate_analysis_payload(parsed)
        if valid:
            logger.info("Meeting analysis parsed and validated successfully on initial attempt.")
            return validated_data
    except Exception as e:
        err_msg = f"JSON decoding error: {e}"

    # Retrying once with error feedback if output failed validation
    logger.warning(f"Analysis response failed validation: {err_msg}. Retrying once with error feedback...")
    retry_prompt = get_analysis_retry_prompt(err_msg, raw_content)
    retry_contents = [
        types.Content(role="user", parts=[types.Part.from_text(text=user_prompt)]),
        types.Content(role="model", parts=[types.Part.from_text(text=raw_content)]),
        types.Content(role="user", parts=[types.Part.from_text(text=retry_prompt)]),
    ]

    retry_response = call_gemini_with_rate_limit_retry(
        client=client,
        model=model_name,
        contents=retry_contents,
        config=gen_config,
    )
    retry_raw = retry_response.text or ""

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
