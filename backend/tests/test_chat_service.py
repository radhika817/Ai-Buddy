import unittest
from unittest.mock import MagicMock, patch
from google.genai import errors

from app.models.meeting import Meeting
from app.models.transcript import TranscriptSegment
from app.models.action_item import ActionItem
from app.models.decision import Decision
from app.schemas.chat import ChatMessage
from app.services.chat import (
    format_timestamp,
    truncate_transcript_from_middle,
    build_meeting_context,
    ask_meeting_ai,
)
from app.services.summarization import GeminiRateLimitError


class TestChatService(unittest.TestCase):

    def test_format_timestamp(self):
        self.assertEqual(format_timestamp(0), "[00:00]")
        self.assertEqual(format_timestamp(15), "[00:15]")
        self.assertEqual(format_timestamp(75.8), "[01:15]")
        self.assertEqual(format_timestamp(3665), "[61:05]")
        self.assertEqual(format_timestamp(None), "[00:00]")

    def test_truncate_transcript_within_limit(self):
        segs = [
            TranscriptSegment(start_time=0.0, text="Hello world"),
            TranscriptSegment(start_time=10.0, text="Second line"),
        ]
        text, truncated = truncate_transcript_from_middle(segs, max_chars=1000)
        self.assertFalse(truncated)
        self.assertIn("[00:00] Hello world", text)
        self.assertIn("[00:10] Second line", text)

    def test_truncate_transcript_from_middle_when_long(self):
        # Create 50 lines of length 40 chars each = ~2000 chars
        segs = [
            TranscriptSegment(start_time=float(i * 10), text=f"Dialogue line number {i:03d} content here.")
            for i in range(50)
        ]
        text, truncated = truncate_transcript_from_middle(segs, max_chars=400)
        self.assertTrue(truncated)
        self.assertIn("[00:00] Dialogue line number 000", text)
        self.assertIn("Dialogue line number 049", text)
        self.assertIn("Transcript truncated in the middle", text)

    def test_build_meeting_context(self):
        meeting = Meeting(id=1, title="Sprint Planning", summary="Discussed sprint goals.")
        meeting.key_points = ["Ship MVP"]
        segs = [TranscriptSegment(start_time=5.0, text="Let's build feature X")]
        action_items = [ActionItem(task="Deploy frontend", assigned_to="Bob", deadline_text="Friday", status="pending")]
        decisions = [Decision(decision="Use Gemini Flash-Lite")]

        context = build_meeting_context(meeting, segs, action_items, decisions)
        self.assertIn("Sprint Planning", context)
        self.assertIn("Discussed sprint goals", context)
        self.assertIn("Ship MVP", context)
        self.assertIn("Deploy frontend", context)
        self.assertIn("Bob", context)
        self.assertIn("Use Gemini Flash-Lite", context)
        self.assertIn("[00:05] Let's build feature X", context)

    @patch("app.services.chat.call_gemini_with_rate_limit_retry")
    @patch("app.services.chat.genai.Client")
    @patch("app.services.chat.settings")
    def test_ask_meeting_ai_success(self, mock_settings, mock_client_cls, mock_call):
        mock_settings.GEMINI_API_KEY = "test-key"
        mock_settings.GEMINI_MODEL = "gemini-3.5-flash-lite"

        mock_resp = MagicMock()
        mock_resp.text = "The decision was approved at [02:15]."
        mock_call.return_value = mock_resp

        history = [
            ChatMessage(role="user", content="Hi"),
            ChatMessage(role="assistant", content="Hello! How can I help?"),
        ]

        answer = ask_meeting_ai("Meeting context here", "What was decided?", history)
        self.assertEqual(answer, "The decision was approved at [02:15].")
        self.assertEqual(mock_call.call_count, 1)

    @patch("app.services.chat.call_gemini_with_rate_limit_retry")
    @patch("app.services.chat.genai.Client")
    @patch("app.services.chat.settings")
    def test_ask_meeting_ai_rate_limit_reraise(self, mock_settings, mock_client_cls, mock_call):
        mock_settings.GEMINI_API_KEY = "test-key"
        mock_settings.GEMINI_MODEL = "gemini-3.5-flash-lite"

        mock_call.side_effect = GeminiRateLimitError("Rate limit exceeded")

        with self.assertRaises(GeminiRateLimitError):
            ask_meeting_ai("Context", "Question?", [])


if __name__ == "__main__":
    unittest.main()
