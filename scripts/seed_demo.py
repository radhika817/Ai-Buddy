#!/usr/bin/env python3
"""
scripts/seed_demo.py

Creates or updates a clean demo user account (demo@example.com) in the database.
Does NOT populate any real meeting recordings or private data.

Usage:
    DEMO_PASSWORD="YourPasswordHere" python scripts/seed_demo.py
    # Or with default password:
    python scripts/seed_demo.py
"""

import os
import sys

# Add backend directory to sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR) if os.path.basename(CURRENT_DIR) == "scripts" else CURRENT_DIR
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Load environment variables from backend/.env if present
from dotenv import load_dotenv
env_file = os.path.join(BACKEND_DIR, ".env")
if os.path.exists(env_file):
    load_dotenv(env_file)

from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.core.security import hash_password


def seed_demo_user():
    print("==================================================")
    print("🌱 AI Buddy Demo User Seeder")
    print("==================================================")

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    demo_email = "demo@example.com"
    demo_password = os.environ.get("DEMO_PASSWORD", "DemoPassword123!")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == demo_email).first()
        hashed_pw = hash_password(demo_password)

        if user:
            print(f"ℹ️  User '{demo_email}' already exists (ID: {user.id}). Updating password...")
            user.password_hash = hashed_pw
            if not user.name:
                user.name = "Demo User"
            db.commit()
            print("✅ Password successfully updated.")
        else:
            print(f"👤 Creating new demo user: {demo_email}...")
            user = User(
                email=demo_email,
                name="Demo User",
                password_hash=hashed_pw,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"✅ Demo user successfully created (ID: {user.id})!")

        print("\n--------------------------------------------------")
        print("🎉 Demo Account Ready:")
        print(f"   Email:    {demo_email}")
        print(f"   Password: {demo_password}")
        print("--------------------------------------------------")
        print("💡 Instructions:")
        print("1. Open the frontend login page at http://localhost:5173/login (or your Vercel URL)")
        print(f"2. Sign in with the credentials above")
        print("3. To set a custom password, run:")
        print('   DEMO_PASSWORD="your-secure-password" python scripts/seed_demo.py')
        print("==================================================")

    except Exception as e:
        db.rollback()
        print(f"❌ Failed to seed demo user: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_user()
