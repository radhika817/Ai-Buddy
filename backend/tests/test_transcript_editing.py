import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User
from app.models.meeting import Meeting
from app.models.transcript import TranscriptSegment
from app.core.security import hash_password, create_access_token
from app.services.chat import truncate_transcript_from_middle, build_meeting_context


class TestTranscriptEditingAndRename(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # In-memory SQLite for isolated test runs
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

        # Seed 2 users: user1 (owner) and user2 (other)
        db = cls.TestingSessionLocal()
        cls.u1 = User(email="owner@test.com", password_hash=hash_password("Pass123!"), name="Owner")
        cls.u2 = User(email="other@test.com", password_hash=hash_password("Pass123!"), name="Other")
        db.add_all([cls.u1, cls.u2])
        db.commit()

        cls.u1_id = cls.u1.id
        cls.u2_id = cls.u2.id

        cls.token1 = create_access_token({"sub": str(cls.u1_id), "email": "owner@test.com"})
        cls.token2 = create_access_token({"sub": str(cls.u2_id), "email": "other@test.com"})
        cls.headers1 = {"Authorization": f"Bearer {cls.token1}"}
        cls.headers2 = {"Authorization": f"Bearer {cls.token2}"}

        # Seed meeting for user1
        cls.m1 = Meeting(user_id=cls.u1_id, title="Original Meeting Title", file_path="uploads/test.mp3", status="ready")
        db.add(cls.m1)
        db.commit()
        cls.m1_id = cls.m1.id

        # Seed transcript segments
        cls.seg1 = TranscriptSegment(meeting_id=cls.m1_id, start_time=15.0, end_time=25.0, text="Intro remarks", speaker="Alice", edited=False)
        cls.seg2 = TranscriptSegment(meeting_id=cls.m1_id, start_time=30.0, end_time=45.0, text="Design update", speaker="Alice", edited=False)
        cls.seg3 = TranscriptSegment(meeting_id=cls.m1_id, start_time=50.0, end_time=65.0, text="Backend architecture", speaker=None, edited=False)
        db.add_all([cls.seg1, cls.seg2, cls.seg3])
        db.commit()
        cls.seg1_id = cls.seg1.id
        cls.seg2_id = cls.seg2.id
        cls.seg3_id = cls.seg3.id
        db.close()

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=cls.engine)

    def test_patch_meeting_title_success(self):
        resp = self.client.patch(
            f"/meetings/{self.m1_id}",
            json={"title": "Updated Sprint Sync"},
            headers=self.headers1,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["title"], "Updated Sprint Sync")

    def test_patch_meeting_title_validation(self):
        # Empty title should fail
        resp = self.client.patch(
            f"/meetings/{self.m1_id}",
            json={"title": "   "},
            headers=self.headers1,
        )
        self.assertEqual(resp.status_code, 422)

        # Title exceeding 120 chars should fail
        resp_long = self.client.patch(
            f"/meetings/{self.m1_id}",
            json={"title": "A" * 121},
            headers=self.headers1,
        )
        self.assertEqual(resp_long.status_code, 422)

    def test_patch_meeting_title_unauthorized_user(self):
        resp = self.client.patch(
            f"/meetings/{self.m1_id}",
            json={"title": "Hacked Title"},
            headers=self.headers2,
        )
        self.assertEqual(resp.status_code, 404)

    def test_get_transcript_segments_includes_speaker_and_edited(self):
        resp = self.client.get(f"/meetings/{self.m1_id}/transcript", headers=self.headers1)
        self.assertEqual(resp.status_code, 200)
        items = resp.json()
        self.assertGreaterEqual(len(items), 3)
        self.assertIn("speaker", items[0])
        self.assertIn("edited", items[0])

    def test_patch_transcript_segment_text_marks_edited(self):
        resp = self.client.patch(
            f"/meetings/{self.m1_id}/transcript/{self.seg1_id}",
            json={"text": "Revised intro remarks by speaker"},
            headers=self.headers1,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["text"], "Revised intro remarks by speaker")
        self.assertTrue(data["edited"])

    def test_patch_transcript_segment_speaker_only_does_not_mark_edited(self):
        resp = self.client.patch(
            f"/meetings/{self.m1_id}/transcript/{self.seg3_id}",
            json={"speaker": "Radhika"},
            headers=self.headers1,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["speaker"], "Radhika")
        self.assertFalse(data["edited"])

    def test_patch_transcript_segment_owner_isolation(self):
        resp = self.client.patch(
            f"/meetings/{self.m1_id}/transcript/{self.seg1_id}",
            json={"text": "Unauthorized change"},
            headers=self.headers2,
        )
        self.assertEqual(resp.status_code, 404)

    def test_rename_speaker_everywhere_in_meeting(self):
        resp = self.client.post(
            f"/meetings/{self.m1_id}/speakers/rename",
            json={"old_name": "Alice", "new_name": "Alice Smith"},
            headers=self.headers1,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["old_name"], "Alice")
        self.assertEqual(data["new_name"], "Alice Smith")
        self.assertEqual(data["updated_count"], 2)

        # Verify segments were actually renamed in db
        resp_check = self.client.get(f"/meetings/{self.m1_id}/transcript", headers=self.headers1)
        segs = resp_check.json()
        alice_smith_segs = [s for s in segs if s["speaker"] == "Alice Smith"]
        self.assertEqual(len(alice_smith_segs), 2)

    def test_rename_speaker_owner_isolation(self):
        resp = self.client.post(
            f"/meetings/{self.m1_id}/speakers/rename",
            json={"old_name": "Alice Smith", "new_name": "Bob"},
            headers=self.headers2,
        )
        self.assertEqual(resp.status_code, 404)

    def test_chat_prompt_includes_speaker_when_set(self):
        s1 = TranscriptSegment(start_time=205.0, speaker="Radhika", text="Here is the architecture.")
        s2 = TranscriptSegment(start_time=215.0, speaker=None, text="Unlabeled comment.")
        
        text, truncated = truncate_transcript_from_middle([s1, s2])
        self.assertIn("[03:25] Radhika: Here is the architecture.", text)
        self.assertIn("[03:35] Unlabeled comment.", text)


if __name__ == "__main__":
    unittest.main()
