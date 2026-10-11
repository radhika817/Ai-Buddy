import unittest
from unittest.mock import patch
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.config import settings
from app.models.user import User
from app.models.meeting import Meeting
from app.models.transcript_chunk import TranscriptChunk
from app.core.security import hash_password, create_access_token
from app.main import app
from app.services.embedding import search_transcript_chunks, hybrid_search_chunks


class TestDemoFlags(unittest.TestCase):

    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        # Override get_db dependency
        def override_get_db():
            db = self.Session()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

        # Seed user
        self.user = User(
            id=1,
            email="demotester@example.com",
            name="Demo Tester",
            password_hash=hash_password("password123"),
        )
        self.db.add(self.user)
        self.db.commit()

        self.token = create_access_token({"sub": str(self.user.id), "email": self.user.email})
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_health_check_reports_flags(self):
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("processing_enabled", data)
        self.assertIn("embeddings_enabled", data)

    def test_upload_disabled_when_processing_false(self):
        with patch.object(settings, "ENABLE_PROCESSING", False):
            # Health reports processing_enabled: False
            health_resp = self.client.get("/health")
            self.assertFalse(health_resp.json()["processing_enabled"])

            # POST /meetings validates filename extension first
            bad_ext_resp = self.client.post(
                "/meetings",
                data={"title": "Test Meeting"},
                files={"file": ("test.txt", b"dummy content", "text/plain")},
                headers=self.headers,
            )
            self.assertEqual(bad_ext_resp.status_code, 400)
            self.assertIn("Invalid file type", bad_ext_resp.json()["detail"])

            # Valid extension returns 503 with demo message
            resp = self.client.post(
                "/meetings",
                data={"title": "Demo Meeting"},
                files={"file": ("test.mp3", b"dummy mp3 content", "audio/mpeg")},
                headers=self.headers,
            )
            self.assertEqual(resp.status_code, 503)
            self.assertIn(
                "Uploads and processing are disabled in this demo",
                resp.json()["detail"],
            )

    def test_reindex_disabled_when_processing_or_embeddings_false(self):
        meeting = Meeting(
            id=10,
            user_id=self.user.id,
            title="Meeting 10",
            file_path="meeting10.mp3",
            status="ready",
        )
        self.db.add(meeting)
        self.db.commit()

        with patch.object(settings, "ENABLE_PROCESSING", False):
            resp = self.client.post(f"/meetings/{meeting.id}/reindex", headers=self.headers)
            self.assertEqual(resp.status_code, 503)
            self.assertIn("Uploads and processing are disabled in this demo", resp.json()["detail"])

    def test_search_and_chat_fallback_to_keyword_when_embeddings_false(self):
        # Create meeting and chunks
        meeting = Meeting(
            id=20,
            user_id=self.user.id,
            title="Roadmap Discussion",
            file_path="m20.mp3",
            status="ready",
            indexed=True,
            created_at=datetime(2026, 10, 11, 10, 0, 0),
        )
        self.db.add(meeting)
        self.db.commit()

        chunk = TranscriptChunk(
            id=1,
            user_id=self.user.id,
            meeting_id=meeting.id,
            start_time=10.0,
            end_time=30.0,
            speakers="Alice",
            text="We decided to launch the new authentication service by Friday.",
            embedding=[0.0] * 384,
        )
        self.db.add(chunk)
        self.db.commit()

        with patch.object(settings, "ENABLE_EMBEDDINGS", False):
            # Verify search_transcript_chunks uses keyword matching without loading model
            with patch("app.services.embedding.get_embedding_model") as mock_model:
                results = search_transcript_chunks(
                    db=self.db,
                    user_id=self.user.id,
                    query="authentication",
                    limit=5,
                )
                mock_model.assert_not_called()
                self.assertEqual(len(results), 1)
                self.assertEqual(results[0]["chunk_id"], 1)
                self.assertIn("authentication", results[0]["text"])

            # Verify hybrid_search_chunks also falls back directly to keyword matching
            with patch("app.services.embedding.get_embedding_model") as mock_model:
                hybrid_res = hybrid_search_chunks(
                    db=self.db,
                    user_id=self.user.id,
                    query="authentication",
                )
                mock_model.assert_not_called()
                self.assertEqual(len(hybrid_res), 1)
                self.assertEqual(hybrid_res[0]["chunk_id"], 1)

            # Test GET /search endpoint
            search_api_resp = self.client.get("/search?q=authentication", headers=self.headers)
            self.assertEqual(search_api_resp.status_code, 200)
            items = search_api_resp.json()
            self.assertEqual(len(items), 1)
            self.assertEqual(items[0]["meeting_id"], 20)


if __name__ == "__main__":
    unittest.main()
