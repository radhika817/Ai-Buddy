import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core.database import Base
from app.models.user import User
from app.models.meeting import Meeting
from app.models.transcript_chunk import TranscriptChunk
from app.schemas.chat import ChatRequest, ChatMessage
from app.services.chat import (
    InMemoryRateLimiter,
    format_time_mm_ss,
    format_chunks_for_cross_meeting_llm,
    rewrite_search_query_with_gemini,
    ask_cross_meeting_ai,
)
from app.services.embedding import keyword_search_chunks, hybrid_search_chunks
from app.api.chat import cross_meeting_chat
from app.services.summarization import GeminiRateLimitError


class TestCrossMeetingChat(unittest.TestCase):

    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        # Create two test users
        self.user1 = User(id=1, email="alice@example.com", name="Alice", password_hash="hash1")
        self.user2 = User(id=2, email="bob@example.com", name="Bob", password_hash="hash2")
        self.db.add_all([self.user1, self.user2])
        self.db.commit()

        # Dedicated test rate limiter
        self.rate_limiter = InMemoryRateLimiter(max_requests=20, window_seconds=60.0)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_rate_limiter_allows_20_and_blocks_21st(self):
        limiter = InMemoryRateLimiter(max_requests=20, window_seconds=60.0)
        user_id = 999
        for _ in range(20):
            self.assertTrue(limiter.check_and_record(user_id))
        # 21st request within window must be blocked
        self.assertFalse(limiter.check_and_record(user_id))

    def test_format_time_mm_ss(self):
        self.assertEqual(format_time_mm_ss(0.0), "00:00")
        self.assertEqual(format_time_mm_ss(65.0), "01:05")
        self.assertEqual(format_time_mm_ss(205.0), "03:25")
        self.assertEqual(format_time_mm_ss(None), "00:00")

    def test_format_chunks_for_llm(self):
        chunks = [
            {
                "meeting_title": "Sprint Review",
                "meeting_date": datetime(2026, 10, 4, 10, 0, tzinfo=timezone.utc),
                "start_time": 205.0,
                "text": "Alice: We will deploy backend on Friday.",
            },
            {
                "meeting_title": "Architecture Sync",
                "meeting_date": datetime(2026, 10, 6, 14, 0, tzinfo=timezone.utc),
                "start_time": 45.0,
                "text": "Bob: Shifted deployment to next Tuesday.",
            },
        ]
        formatted = format_chunks_for_cross_meeting_llm(chunks)
        self.assertIn("[Meeting: Sprint Review | 2026-10-04 | 03:25] Alice: We will deploy backend on Friday.", formatted)
        self.assertIn("[Meeting: Architecture Sync | 2026-10-06 | 00:45] Bob: Shifted deployment to next Tuesday.", formatted)

    def test_no_indexed_meetings_returns_friendly_message(self):
        # User has no indexed meetings
        payload = ChatRequest(question="When is the deployment?", history=[])
        res = cross_meeting_chat(payload=payload, db=self.db, current_user=self.user1)
        self.assertIn("You don't have any indexed meetings yet", res.answer)
        self.assertEqual(res.sources, [])

    def test_hybrid_search_deduplication_and_date_sorting(self):
        # Create 2 meetings with dates
        d1 = datetime(2026, 9, 1, 10, 0)
        d2 = datetime(2026, 10, 1, 10, 0)
        m1 = Meeting(id=10, user_id=self.user1.id, title="September Meeting", file_path="f1.mp3", status="ready", indexed=True, created_at=d1)
        m2 = Meeting(id=20, user_id=self.user1.id, title="October Meeting", file_path="f2.mp3", status="ready", indexed=True, created_at=d2)
        self.db.add_all([m1, m2])
        self.db.commit()

        # Add chunks
        c1 = TranscriptChunk(
            id=101, user_id=self.user1.id, meeting_id=m1.id, start_time=10.0, end_time=20.0,
            text="Initial discussion about PR-404 and deployment roadmap.", embedding=[0.1]*384,
        )
        c2 = TranscriptChunk(
            id=102, user_id=self.user1.id, meeting_id=m2.id, start_time=5.0, end_time=15.0,
            text="Update on PR-404: ticket merged and ready for release.", embedding=[0.1]*384,
        )
        self.db.add_all([c1, c2])
        self.db.commit()

        # Run keyword search for "PR-404"
        kw_results = keyword_search_chunks(self.db, user_id=self.user1.id, query="PR-404")
        self.assertEqual(len(kw_results), 2)

        # Run hybrid search
        hybrid_results = hybrid_search_chunks(self.db, user_id=self.user1.id, query="PR-404")
        # Ensure chronological ordering: m1 (September) before m2 (October)
        self.assertEqual(len(hybrid_results), 2)
        self.assertEqual(hybrid_results[0]["meeting_id"], m1.id)
        self.assertEqual(hybrid_results[1]["meeting_id"], m2.id)

    def test_user_isolation_in_cross_meeting_chat(self):
        # Create meeting for user 2 with secret data
        m_user2 = Meeting(id=30, user_id=self.user2.id, title="Bob Secret Meeting", file_path="b.mp3", status="ready", indexed=True)
        self.db.add(m_user2)
        self.db.commit()

        c_user2 = TranscriptChunk(
            id=301, user_id=self.user2.id, meeting_id=m_user2.id, start_time=0.0, end_time=10.0,
            text="Secret acquisition code: PROJECT_TITAN.", embedding=[0.05]*384,
        )
        self.db.add(c_user2)
        self.db.commit()

        # Also add a regular meeting for user 1
        m_user1 = Meeting(id=40, user_id=self.user1.id, title="Alice Public", file_path="a.mp3", status="ready", indexed=True)
        self.db.add(m_user1)
        self.db.commit()
        c_user1 = TranscriptChunk(
            id=401, user_id=self.user1.id, meeting_id=m_user1.id, start_time=0.0, end_time=10.0,
            text="General weekly retro notes.", embedding=[0.01]*384,
        )
        self.db.add(c_user1)
        self.db.commit()

        # Hybrid search as user 1 for "PROJECT_TITAN" must return NOTHING
        res = hybrid_search_chunks(self.db, user_id=self.user1.id, query="PROJECT_TITAN")
        for chunk in res:
            self.assertNotEqual(chunk["meeting_id"], m_user2.id)
            self.assertNotIn("PROJECT_TITAN", chunk["text"])

    def test_query_rewriting_fallback_on_error(self):
        # When Gemini fails during rewrite, gracefully returns raw question
        with patch("app.services.chat.call_gemini_with_rate_limit_retry", side_effect=Exception("API unavailable")):
            history = [ChatMessage(role="user", content="Where is the file?")]
            rewritten = rewrite_search_query_with_gemini("What about the other one?", history)
            self.assertEqual(rewritten, "What about the other one?")

    def test_end_to_end_cross_meeting_chat_with_mocked_llm(self):
        m = Meeting(id=50, user_id=self.user1.id, title="Sprint Planning", file_path="p.mp3", status="ready", indexed=True)
        self.db.add(m)
        self.db.commit()
        c = TranscriptChunk(
            id=501, user_id=self.user1.id, meeting_id=m.id, start_time=125.0, end_time=135.0,
            text="Alice: The database migration is scheduled for Friday 5 PM.", embedding=[0.2]*384,
        )
        self.db.add(c)
        self.db.commit()

        mock_llm_response = MagicMock()
        mock_llm_response.text = "The database migration is scheduled for Friday at 5 PM [Sprint Planning, 02:05]."

        with patch("app.services.chat.call_gemini_with_rate_limit_retry", return_value=mock_llm_response):
            payload = ChatRequest(question="When is the database migration scheduled?", history=[])
            res = cross_meeting_chat(payload=payload, db=self.db, current_user=self.user1)
            self.assertIn("Friday at 5 PM", res.answer)
            self.assertEqual(len(res.sources), 1)
            self.assertEqual(res.sources[0].meeting_id, m.id)
            self.assertEqual(res.sources[0].meeting_title, "Sprint Planning")
            self.assertEqual(res.sources[0].start_time, 125.0)
            self.assertTrue(len(res.sources[0].text_preview) <= 150)


if __name__ == "__main__":
    unittest.main()
