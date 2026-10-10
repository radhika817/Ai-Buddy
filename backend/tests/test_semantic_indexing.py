import unittest
from datetime import timedelta
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import HTTPException

from app.core.database import Base
from app.models.user import User
from app.models.meeting import Meeting
from app.models.transcript import TranscriptSegment
from app.models.transcript_chunk import TranscriptChunk
from app.services.embedding import (
    chunk_transcript_segments,
    get_embedding_model,
    index_meeting_transcript,
    search_transcript_chunks,
)
from app.api.deps import get_current_user
from app.core.security import create_access_token
from fastapi.security import HTTPAuthorizationCredentials


class TestSemanticIndexing(unittest.TestCase):

    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        # Create two distinct test users
        self.user1 = User(email="user1@example.com", name="User One", password_hash="hash1")
        self.user2 = User(email="user2@example.com", name="User Two", password_hash="hash2")
        self.db.add_all([self.user1, self.user2])
        self.db.commit()
        self.db.refresh(self.user1)
        self.db.refresh(self.user2)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_chunking_with_speakers_and_overlap(self):
        # Create fake transcript segments
        class MockSeg:
            def __init__(self, start_time, end_time, text, speaker=None):
                self.start_time = start_time
                self.end_time = end_time
                self.text = text
                self.speaker = speaker

        # 6 segments of ~300 chars each
        segments = [
            MockSeg(0.0, 10.0, "Segment A " * 25, "Alice"),     # ~250 chars
            MockSeg(10.0, 20.0, "Segment B " * 25, "Bob"),       # ~250 chars
            MockSeg(20.0, 30.0, "Segment C " * 25, "Alice"),     # ~250 chars
            MockSeg(30.0, 40.0, "Segment D " * 25, "Charlie"),   # ~250 chars
            MockSeg(40.0, 50.0, "Segment E " * 25, "Bob"),       # ~250 chars
            MockSeg(50.0, 60.0, "Segment F " * 25, "Alice"),     # ~250 chars
        ]

        chunks = chunk_transcript_segments(segments, min_chars=1000, max_chars=1500)
        self.assertGreater(len(chunks), 1)

        # Check chunk structure
        for c in chunks:
            self.assertIn("start_time", c)
            self.assertIn("end_time", c)
            self.assertIn("speakers", c)
            self.assertIn("text", c)
            self.assertGreater(len(c["text"]), 500)

        # Verify first chunk contains speaker labels in formatted text
        self.assertIn("Alice: ", chunks[0]["text"])
        self.assertIn("Bob: ", chunks[0]["text"])

        # Check overlap: last segment of chunk 0 should appear in chunk 1
        chunk0_lines = chunks[0]["text"].split("\n")
        chunk1_lines = chunks[1]["text"].split("\n")
        self.assertEqual(chunk0_lines[-1], chunk1_lines[0])

    def test_chunking_short_transcript(self):
        class MockSeg:
            def __init__(self, start_time, end_time, text, speaker=None):
                self.start_time = start_time
                self.end_time = end_time
                self.text = text
                self.speaker = speaker

        segments = [
            MockSeg(0.0, 5.0, "Quick standup meeting.", "Alice"),
            MockSeg(5.0, 10.0, "All good from my side.", "Bob"),
        ]
        chunks = chunk_transcript_segments(segments)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0]["start_time"], 0.0)
        self.assertEqual(chunks[0]["end_time"], 10.0)
        self.assertEqual(chunks[0]["speakers"], "Alice, Bob")
        self.assertIn("Alice: Quick standup meeting.", chunks[0]["text"])
        self.assertIn("Bob: All good from my side.", chunks[0]["text"])

    def test_embedding_model_singleton_reuse(self):
        # Call get_embedding_model twice, confirm same instance returned
        m1 = get_embedding_model()
        m2 = get_embedding_model()
        self.assertIs(m1, m2)

    def test_meeting_cascade_delete_chunks(self):
        meeting = Meeting(
            user_id=self.user1.id,
            title="Design Review",
            file_path="uploads/test.mp3",
            status="ready",
            indexed=True,
        )
        self.db.add(meeting)
        self.db.commit()
        self.db.refresh(meeting)

        chunk = TranscriptChunk(
            user_id=self.user1.id,
            meeting_id=meeting.id,
            start_time=0.0,
            end_time=15.0,
            speakers="Alice",
            text="Alice: Architecture discussion.",
            embedding=[0.01] * 384,
        )
        self.db.add(chunk)
        self.db.commit()

        # Verify chunk exists
        count = self.db.query(TranscriptChunk).filter(TranscriptChunk.meeting_id == meeting.id).count()
        self.assertEqual(count, 1)

        # Delete meeting
        self.db.delete(meeting)
        self.db.commit()

        # Verify chunk was cascade deleted
        count_after = self.db.query(TranscriptChunk).filter(TranscriptChunk.meeting_id == meeting.id).count()
        self.assertEqual(count_after, 0)

    def test_index_meeting_transcript(self):
        meeting = Meeting(
            user_id=self.user1.id,
            title="Q3 Roadmap Planning",
            file_path="uploads/roadmap.mp3",
            status="ready",
            indexed=False,
        )
        self.db.add(meeting)
        self.db.commit()
        self.db.refresh(meeting)

        # Add segments
        s1 = TranscriptSegment(meeting_id=meeting.id, start_time=0.0, end_time=10.0, text="Let us review Q3 roadmap priorities.", speaker="Alice")
        s2 = TranscriptSegment(meeting_id=meeting.id, start_time=10.0, end_time=20.0, text="We need to ship vector search by next week.", speaker="Bob")
        self.db.add_all([s1, s2])
        self.db.commit()

        # Run indexing
        chunk_count = index_meeting_transcript(meeting.id, self.db)
        self.assertGreaterEqual(chunk_count, 1)

        # Check meeting indexed status
        self.db.refresh(meeting)
        self.assertTrue(meeting.indexed)

        # Check chunk in database
        saved_chunks = self.db.query(TranscriptChunk).filter(TranscriptChunk.meeting_id == meeting.id).all()
        self.assertEqual(len(saved_chunks), chunk_count)
        self.assertEqual(len(saved_chunks[0].embedding), 384)
        self.assertIn("vector search", saved_chunks[0].text)

    def test_search_isolation_across_users(self):
        # Create meeting for user 1
        m1 = Meeting(user_id=self.user1.id, title="User1 Secret Strategy", file_path="u1.mp3", status="ready")
        # Create meeting for user 2
        m2 = Meeting(user_id=self.user2.id, title="User2 Public Notes", file_path="u2.mp3", status="ready")
        self.db.add_all([m1, m2])
        self.db.commit()
        self.db.refresh(m1)
        self.db.refresh(m2)

        # Add segments & index for both
        s1 = TranscriptSegment(meeting_id=m1.id, start_time=0.0, end_time=10.0, text="Highly confidential company acquisition plans.")
        s2 = TranscriptSegment(meeting_id=m2.id, start_time=0.0, end_time=10.0, text="General marketing campaign discussion.")
        self.db.add_all([s1, s2])
        self.db.commit()

        index_meeting_transcript(m1.id, self.db)
        index_meeting_transcript(m2.id, self.db)

        # Search as user 1 for "acquisition"
        results_user1 = search_transcript_chunks(self.db, user_id=self.user1.id, query="acquisition plans", limit=5)
        self.assertGreaterEqual(len(results_user1), 1)
        self.assertEqual(results_user1[0]["meeting_id"], m1.id)
        self.assertEqual(results_user1[0]["meeting_title"], "User1 Secret Strategy")

        # Search as user 2 for "acquisition" -> MUST NOT return user 1's chunks
        results_user2 = search_transcript_chunks(self.db, user_id=self.user2.id, query="acquisition plans", limit=5)
        for res in results_user2:
            self.assertNotEqual(res["meeting_id"], m1.id)
            self.assertEqual(res["meeting_id"], m2.id)

    def test_background_indexing_failure_keeps_meeting_ready(self):
        # Verify that if index_meeting_transcript raises an error in transcription worker,
        # meeting status stays "ready" and error is logged.
        from app.services.transcription import process_meeting_transcription

        # Mock dependencies in transcription worker
        meeting = Meeting(
            user_id=self.user1.id,
            title="Resilience Test",
            file_path="uploads/resilience.mp3",
            status="uploaded",
        )
        self.db.add(meeting)
        self.db.commit()
        self.db.refresh(meeting)

        with patch("app.services.transcription.SessionLocal", return_value=self.db), \
             patch("app.services.transcription.os.path.exists", return_value=True), \
             patch("app.services.transcription.convert_to_wav"), \
             patch("app.services.transcription.get_whisper_model") as mock_whisper, \
             patch("app.services.summarization.analyze_meeting_transcript", return_value={"summary": "Sum", "key_points": ["K1"], "action_items": [], "decisions": []}), \
             patch("app.services.embedding.index_meeting_transcript", side_effect=Exception("Simulated vector DB outage")):

            # Setup mock whisper generator
            mock_seg = MagicMock()
            mock_seg.start = 0.0
            mock_seg.end = 5.0
            mock_seg.text = "Hello world transcription."
            mock_whisper.return_value.transcribe.return_value = ([mock_seg], None)

            # Run transcription worker
            process_meeting_transcription(meeting.id)

            # Meeting should be marked "ready" (NOT "failed") even though indexing failed
            self.db.refresh(meeting)
            self.assertEqual(meeting.status, "ready")
            self.assertFalse(meeting.indexed)


if __name__ == "__main__":
    unittest.main()
