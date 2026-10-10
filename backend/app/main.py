from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.database import Base, engine
# Import models to ensure they are registered with Base.metadata
from app.models.user import User  # noqa: F401
from app.models.meeting import Meeting  # noqa: F401
from app.models.transcript import TranscriptSegment  # noqa: F401
from app.models.transcript_chunk import TranscriptChunk  # noqa: F401
from app.models.action_item import ActionItem  # noqa: F401
from app.models.decision import Decision  # noqa: F401
from app.api.meetings import router as meetings_router
from app.api.action_items import router as action_items_router
from app.api.auth import router as auth_router
from app.api.search import router as search_router
from app.api.chat import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist
    Base.metadata.create_all(bind=engine)
    # Ensure columns and extensions exist on existing tables
    try:
        with engine.connect() as conn:
            if engine.dialect.name == "postgresql":
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.execute(text("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS error_message TEXT;"))
            conn.execute(text("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS summary TEXT;"))
            conn.execute(text("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS key_points JSON;"))
            conn.execute(text("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS indexed BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("UPDATE meetings SET indexed = FALSE WHERE indexed IS NULL;"))
            conn.execute(text("ALTER TABLE transcript_segments ADD COLUMN IF NOT EXISTS speaker TEXT;"))
            conn.execute(text("ALTER TABLE transcript_segments ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("UPDATE transcript_segments SET edited = FALSE WHERE edited IS NULL;"))
            conn.execute(text("ALTER TABLE action_items ADD COLUMN IF NOT EXISTS deadline_date DATE;"))
            if engine.dialect.name == "postgresql":
                conn.execute(text("SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));"))
            conn.commit()
    except Exception as e:
        print(f"Schema update notice: {e}")
    yield


app = FastAPI(
    title="AI Buddy API",
    description="AI-powered virtual meeting assistant backend",
    version="0.1.0",
    lifespan=lifespan,
)

# Enable CORS for frontend clients (configured via FRONTEND_URL or defaults to localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth_router)
app.include_router(meetings_router)
app.include_router(action_items_router)
app.include_router(search_router)
app.include_router(chat_router)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
