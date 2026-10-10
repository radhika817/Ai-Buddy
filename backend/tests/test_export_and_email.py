import unittest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User
from app.models.meeting import Meeting
from app.models.transcript import TranscriptSegment
from app.models.action_item import ActionItem
from app.models.decision import Decision
from app.core.security import hash_password, create_access_token
from app.services.export import sanitize_export_filename, generate_meeting_markdown
from app.services.summarization import GeminiRateLimitError


class TestExportAndFollowUpEmail(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=cls.engine)
        Base.metadata.create_all(bind=cls.engine)

        def override_get_db():
            db = cls.TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

        db = cls.TestingSessionLocal()
        cls.u1 = User(email="owner_export@test.com", password_hash=hash_password("Pass123!"), name="Owner")
        cls.u2 = User(email="other_export@test.com", password_hash=hash_password("Pass123!"), name="Other")
        db.add_all([cls.u1, cls.u2])
        db.commit()

        cls.u1_id = cls.u1.id
        cls.u2_id = cls.u2.id

        cls.token1 = create_access_token({"sub": str(cls.u1_id), "email": "owner_export@test.com"})
        cls.token2 = create_access_token({"sub": str(cls.u2_id), "email": "other_export@test.com"})
        cls.headers1 = {"Authorization": f"Bearer {cls.token1}"}
        cls.headers2 = {"Authorization": f"Bearer {cls.token2}"}

        # Ready meeting for user1
        cls.m_ready = Meeting(
            user_id=cls.u1_id,
            title="Q3 Roadmap Sync (Beta!)",
            file_path="uploads/test.mp3",
            status="ready",
            summary="Discussed Q3 goals and architecture.",
            key_points=["Ship beta by August", "Upgrade database"],
        )
        # Not ready meeting for user1
        cls.m_processing = Meeting(
            user_id=cls.u1_id,
            title="In Progress Sync",
            file_path="uploads/test2.mp3",
            status="transcribing",
        )
        db.add_all([cls.m_ready, cls.m_processing])
        db.commit()

        cls.m_ready_id = cls.m_ready.id
        cls.m_proc_id = cls.m_processing.id

        # Add segments, action items, decisions to ready meeting
        seg1 = TranscriptSegment(
            meeting_id=cls.m_ready_id,
            start_time=12.5,
            end_time=20.0,
            speaker="Radhika",
            text="Welcome to the roadmap sync.",
        )
        seg2 = TranscriptSegment(
            meeting_id=cls.m_ready_id,
            start_time=25.0,
            end_time=35.0,
            speaker=None,
            text="Let's review the deliverables.",
        )
        ai1 = ActionItem(
            meeting_id=cls.m_ready_id,
            task="Deploy auth service",
            assigned_to="Radhika",
            deadline_text="Friday 5pm",
            status="pending",
        )
        ai2 = ActionItem(
            meeting_id=cls.m_ready_id,
            task="Draft documentation",
            assigned_to=None,
            deadline_text=None,
            status="completed",
        )
        dec1 = Decision(
            meeting_id=cls.m_ready_id,
            decision="Adopt Gemini 2.5 Flash-Lite for email drafts",
        )
        db.add_all([seg1, seg2, ai1, ai2, dec1])
        db.commit()
        db.close()

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=cls.engine)

    def test_sanitize_export_filename(self):
        self.assertEqual(sanitize_export_filename("Sprint 4: Frontend & Backend!", 1), "Sprint-4-Frontend-Backend.md")
        self.assertEqual(sanitize_export_filename("   ", 42), "meeting-42.md")
        self.assertEqual(sanitize_export_filename("test---name", 2), "test-name.md")

    def test_generate_meeting_markdown_content(self):
        db = self.TestingSessionLocal()
        meeting = db.query(Meeting).filter(Meeting.id == self.m_ready_id).first()
        segs = db.query(TranscriptSegment).filter(TranscriptSegment.meeting_id == self.m_ready_id).all()
        ais = db.query(ActionItem).filter(ActionItem.meeting_id == self.m_ready_id).all()
        decs = db.query(Decision).filter(Decision.meeting_id == self.m_ready_id).all()

        md = generate_meeting_markdown(meeting, segs, ais, decs)
        db.close()

        self.assertIn("# Q3 Roadmap Sync (Beta!)", md)
        self.assertIn("## Executive Summary", md)
        self.assertIn("Discussed Q3 goals and architecture.", md)
        self.assertIn("## Key Points", md)
        self.assertIn("- Ship beta by August", md)
        self.assertIn("## Action Items", md)
        self.assertIn("- [ ] Deploy auth service (Assignee: Radhika, Deadline: Friday 5pm)", md)
        self.assertIn("- [x] Draft documentation (Assignee: Unassigned, Deadline: No deadline)", md)
        self.assertIn("## Key Decisions", md)
        self.assertIn("- Adopt Gemini 2.5 Flash-Lite for email drafts", md)
        self.assertIn("## Transcript", md)
        self.assertIn("[00:12] Radhika: Welcome to the roadmap sync.", md)
        self.assertIn("[00:25] Let's review the deliverables.", md)

    def test_export_meeting_endpoint_success(self):
        resp = self.client.get(
            f"/meetings/{self.m_ready_id}/export?format=md",
            headers=self.headers1,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("text/markdown", resp.headers["content-type"])
        self.assertIn("attachment;", resp.headers["content-disposition"])
        self.assertIn("Q3-Roadmap-Sync-Beta.md", resp.headers["content-disposition"])
        self.assertIn("# Q3 Roadmap Sync (Beta!)", resp.text)
        self.assertIn("- [ ] Deploy auth service", resp.text)

    def test_export_meeting_unauthorized_user(self):
        resp = self.client.get(
            f"/meetings/{self.m_ready_id}/export?format=md",
            headers=self.headers2,
        )
        self.assertEqual(resp.status_code, 404)

    def test_export_meeting_not_ready(self):
        resp = self.client.get(
            f"/meetings/{self.m_proc_id}/export?format=md",
            headers=self.headers1,
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("not ready", resp.json()["detail"])

    def test_export_meeting_unsupported_format(self):
        resp = self.client.get(
            f"/meetings/{self.m_ready_id}/export?format=pdf",
            headers=self.headers1,
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Unsupported export format", resp.json()["detail"])

    @patch("app.services.email_draft.call_gemini_with_rate_limit_retry")
    @patch("app.services.email_draft.genai.Client")
    @patch("app.services.email_draft.settings")
    def test_create_follow_up_email_success(self, mock_settings, mock_client_cls, mock_call):
        mock_settings.GEMINI_API_KEY = "test-key"
        mock_settings.GEMINI_MODEL = "gemini-3.5-flash-lite"

        mock_resp = MagicMock()
        mock_resp.text = '{"subject": "Recap: Q3 Roadmap Sync", "body": "Hi team,\\nHere is the recap..."}'
        mock_call.return_value = mock_resp

        resp = self.client.post(
            f"/meetings/{self.m_ready_id}/follow-up-email",
            json={"tone": "friendly"},
            headers=self.headers1,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["subject"], "Recap: Q3 Roadmap Sync")
        self.assertIn("Hi team", data["body"])

    def test_create_follow_up_email_unauthorized_user(self):
        resp = self.client.post(
            f"/meetings/{self.m_ready_id}/follow-up-email",
            json={"tone": "formal"},
            headers=self.headers2,
        )
        self.assertEqual(resp.status_code, 404)

    def test_create_follow_up_email_not_ready(self):
        resp = self.client.post(
            f"/meetings/{self.m_proc_id}/follow-up-email",
            json={"tone": "friendly"},
            headers=self.headers1,
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("not ready", resp.json()["detail"])

    @patch("app.services.email_draft.call_gemini_with_rate_limit_retry")
    @patch("app.services.email_draft.genai.Client")
    @patch("app.services.email_draft.settings")
    def test_create_follow_up_email_rate_limit(self, mock_settings, mock_client_cls, mock_call):
        mock_settings.GEMINI_API_KEY = "test-key"
        mock_settings.GEMINI_MODEL = "gemini-3.5-flash-lite"
        mock_call.side_effect = GeminiRateLimitError("Rate limit exceeded")

        resp = self.client.post(
            f"/meetings/{self.m_ready_id}/follow-up-email",
            json={"tone": "friendly"},
            headers=self.headers1,
        )
        self.assertEqual(resp.status_code, 429)
        self.assertIn("high demand", resp.json()["detail"])


if __name__ == "__main__":
    unittest.main()
