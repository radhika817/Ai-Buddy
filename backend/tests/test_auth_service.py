import os
import unittest
from datetime import timedelta
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.models.user import User
from app.models.meeting import Meeting
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.api.deps import get_current_user
from fastapi.security import HTTPAuthorizationCredentials


class TestAuthService(unittest.TestCase):

    def setUp(self):
        # In-memory SQLite for test isolation
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_password_hashing_and_verification(self):
        pwd = "superSecretPassword123"
        hashed = hash_password(pwd)
        self.assertTrue(verify_password(pwd, hashed))
        self.assertFalse(verify_password("wrongPassword", hashed))
        self.assertFalse(verify_password(pwd, ""))

    def test_jwt_token_creation_and_decoding(self):
        data = {"sub": "42", "email": "test@example.com"}
        token = create_access_token(data)
        decoded = decode_access_token(token)
        self.assertIsNotNone(decoded)
        self.assertEqual(decoded["sub"], "42")
        self.assertEqual(decoded["email"], "test@example.com")

    def test_jwt_expired_token(self):
        data = {"sub": "42"}
        expired_token = create_access_token(data, expires_delta=timedelta(seconds=-10))
        decoded = decode_access_token(expired_token)
        self.assertIsNone(decoded)

    def test_get_current_user_valid_token(self):
        user = User(
            email="alice@example.com",
            password_hash=hash_password("pw123"),
            name="Alice",
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        token = create_access_token({"sub": str(user.id), "email": user.email})
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        current_user = get_current_user(auth_credentials=credentials, db=self.db)
        self.assertEqual(current_user.id, user.id)
        self.assertEqual(current_user.email, "alice@example.com")

    def test_get_current_user_missing_or_invalid_token(self):
        # Missing credentials
        with self.assertRaises(HTTPException) as cm:
            get_current_user(auth_credentials=None, db=self.db)
        self.assertEqual(cm.exception.status_code, 401)

        # Invalid token string
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="bad.invalid.token")
        with self.assertRaises(HTTPException) as cm:
            get_current_user(auth_credentials=credentials, db=self.db)
        self.assertEqual(cm.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
