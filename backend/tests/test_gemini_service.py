import os
import sys
import json
import unittest
from unittest.mock import MagicMock, patch
from google.genai import errors, types

from app.core.config import Settings
from app.services.summarization import (
    extract_json_str,
    validate_analysis_payload,
    is_rate_limit_error,
    call_gemini_with_rate_limit_retry,
    analyze_meeting_transcript,
    GeminiRateLimitError,
)


class TestGeminiService(unittest.TestCase):

    def test_settings_gemini_config(self):
        """Verify Settings has GEMINI_API_KEY and GEMINI_MODEL and not OPENAI_API_KEY."""
        s = Settings(
            DATABASE_URL="postgresql://localhost/dummy",
            GEMINI_API_KEY="test_key_123",
            GEMINI_MODEL="gemini-2.5-flash-lite",
        )
        self.assertEqual(s.GEMINI_API_KEY, "test_key_123")
        self.assertEqual(s.GEMINI_MODEL, "gemini-2.5-flash-lite")
        self.assertFalse(hasattr(s, "OPENAI_API_KEY"))

    def test_extract_json_str(self):
        """Verify markdown codeblock stripping."""
        raw_md = "```json\n{\"summary\": \"Test summary\"}\n```"
        self.assertEqual(extract_json_str(raw_md), '{"summary": "Test summary"}')

        raw_plain = '{"summary": "Test summary"}'
        self.assertEqual(extract_json_str(raw_plain), '{"summary": "Test summary"}')

    def test_validate_analysis_payload(self):
        """Verify validation logic for summary, key_points, action_items, and decisions."""
        valid_payload = {
            "summary": "This is a great meeting summary that covers the core topics.",
            "key_points": ["First point discussed", "Second point agreed upon"],
            "action_items": [
                {"task": "Prepare the slide deck", "assigned_to": "Alice", "deadline_text": "Friday 5pm"},
                {"task": "Review PR", "assigned_to": None, "deadline_text": None},
            ],
            "decisions": ["Approved Q4 budget"],
        }
        is_valid, err_msg, validated = validate_analysis_payload(valid_payload)
        self.assertTrue(is_valid)
        self.assertEqual(err_msg, "")
        self.assertEqual(validated["summary"], valid_payload["summary"])
        self.assertEqual(len(validated["action_items"]), 2)
        self.assertEqual(len(validated["decisions"]), 1)

        # Invalid payload (missing summary)
        invalid_payload = {
            "summary": "",
            "key_points": ["Point"],
        }
        is_valid, err_msg, _ = validate_analysis_payload(invalid_payload)
        self.assertFalse(is_valid)
        self.assertIn("summary", err_msg)

    def test_is_rate_limit_error(self):
        """Verify identification of HTTP 429 / RESOURCE_EXHAUSTED errors."""
        err_429 = errors.APIError(code=429, response_json={"error": "Resource exhausted"}, response=None)
        self.assertTrue(is_rate_limit_error(err_429))

        err_resource_exhausted = Exception("429 RESOURCE_EXHAUSTED: Quota exceeded for quota metric 'GenerateContent'")
        self.assertTrue(is_rate_limit_error(err_resource_exhausted))

        err_other = errors.APIError(code=400, response_json={"error": "Invalid argument"}, response=None)
        self.assertFalse(is_rate_limit_error(err_other))

        err_auth = errors.APIError(code=401, response_json={"error": "Invalid API key"}, response=None)
        self.assertFalse(is_rate_limit_error(err_auth))

    def test_rate_limit_retry_success_after_recovering(self):
        """Verify call_gemini_with_rate_limit_retry recovers from transient 429."""
        mock_client = MagicMock()
        err_429 = errors.APIError(code=429, response_json={"error": "Resource exhausted"}, response=None)
        mock_response = MagicMock()
        mock_response.text = '{"summary": "recovered"}'

        # Fail twice with 429, then succeed on 3rd attempt
        mock_client.models.generate_content.side_effect = [err_429, err_429, mock_response]

        resp = call_gemini_with_rate_limit_retry(
            client=mock_client,
            model="gemini-2.5-flash-lite",
            contents="hello",
            config=None,
            max_retries=3,
            initial_delay=0.01,
        )
        self.assertEqual(resp, mock_response)
        self.assertEqual(mock_client.models.generate_content.call_count, 3)

    def test_rate_limit_retry_exhausted_raises_error(self):
        """Verify call_gemini_with_rate_limit_retry raises GeminiRateLimitError when max retries are exceeded."""
        mock_client = MagicMock()
        err_429 = errors.APIError(code=429, response_json={"error": "Quota exceeded"}, response=None)
        mock_client.models.generate_content.side_effect = [err_429, err_429, err_429, err_429]

        with self.assertRaises(GeminiRateLimitError) as cm:
            call_gemini_with_rate_limit_retry(
                client=mock_client,
                model="gemini-2.5-flash-lite",
                contents="hello",
                config=None,
                max_retries=3,
                initial_delay=0.01,
            )
        self.assertIn("rate limit reached (HTTP 429)", str(cm.exception))
        self.assertEqual(mock_client.models.generate_content.call_count, 4)

    def test_non_rate_limit_error_not_retried(self):
        """Verify non-429 error fails fast without retrying."""
        mock_client = MagicMock()
        err_400 = errors.APIError(code=400, response_json={"error": "Bad request"}, response=None)
        mock_client.models.generate_content.side_effect = err_400

        with self.assertRaises(errors.APIError):
            call_gemini_with_rate_limit_retry(
                client=mock_client,
                model="gemini-2.5-flash-lite",
                contents="hello",
                config=None,
                max_retries=3,
                initial_delay=0.01,
            )
        self.assertEqual(mock_client.models.generate_content.call_count, 1)

    @patch("app.services.summarization.settings")
    def test_analyze_meeting_transcript_missing_api_key(self, mock_settings):
        """Verify ValueError is raised if GEMINI_API_KEY is not set."""
        mock_settings.GEMINI_API_KEY = ""
        with self.assertRaises(ValueError) as cm:
            analyze_meeting_transcript("Meeting transcript content")
        self.assertIn("GEMINI_API_KEY is not configured", str(cm.exception))

    @patch("app.services.summarization.genai.Client")
    @patch("app.services.summarization.settings")
    def test_analyze_meeting_transcript_initial_success(self, mock_settings, mock_genai_client_class):
        """Verify successful end-to-end extraction on initial call."""
        mock_settings.GEMINI_API_KEY = "dummy-valid-key"
        mock_settings.GEMINI_MODEL = "gemini-2.5-flash-lite"

        mock_client = MagicMock()
        mock_genai_client_class.return_value = mock_client

        expected_payload = {
            "summary": "Team aligned on shipping feature v2 by next sprint.",
            "key_points": [
                "API migration to Google Gemini is complete.",
                "Rate limit retries are configured.",
            ],
            "action_items": [
                {"task": "Run end-to-end smoke test", "assigned_to": "Radhika", "deadline_text": "tomorrow"},
            ],
            "decisions": [
                "Use gemini-2.5-flash-lite for all transcript intelligence.",
            ],
        }

        mock_response = MagicMock()
        mock_response.text = json.dumps(expected_payload)
        mock_client.models.generate_content.return_value = mock_response

        result = analyze_meeting_transcript("Transcript of meeting", "2026-10-09")
        self.assertEqual(result["summary"], expected_payload["summary"])
        self.assertEqual(len(result["action_items"]), 1)
        self.assertEqual(result["action_items"][0]["task"], "Run end-to-end smoke test")
        self.assertEqual(len(result["decisions"]), 1)
        self.assertEqual(mock_client.models.generate_content.call_count, 1)

    @patch("app.services.summarization.genai.Client")
    @patch("app.services.summarization.settings")
    def test_analyze_meeting_transcript_one_retry_on_invalid_json(self, mock_settings, mock_genai_client_class):
        """Verify invalid first response triggers 1-retry with error feedback and succeeds on 2nd attempt."""
        mock_settings.GEMINI_API_KEY = "dummy-valid-key"
        mock_settings.GEMINI_MODEL = "gemini-2.5-flash-lite"

        mock_client = MagicMock()
        mock_genai_client_class.return_value = mock_client

        invalid_response = MagicMock()
        invalid_response.text = "This is not valid json at all!"

        valid_payload = {
            "summary": "Team aligned on shipping feature v2 by next sprint.",
            "key_points": ["Valid point after retry"],
            "action_items": [],
            "decisions": [],
        }
        valid_response = MagicMock()
        valid_response.text = json.dumps(valid_payload)

        # First attempt returns invalid, second attempt returns valid
        mock_client.models.generate_content.side_effect = [invalid_response, valid_response]

        result = analyze_meeting_transcript("Transcript of meeting", "2026-10-09")
        self.assertEqual(result["summary"], valid_payload["summary"])
        self.assertEqual(mock_client.models.generate_content.call_count, 2)


if __name__ == "__main__":
    unittest.main()
