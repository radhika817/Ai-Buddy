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
from app.models.action_item import ActionItem  # noqa: F401
from app.models.decision import Decision  # noqa: F401
from app.api.meetings import router as meetings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist
    Base.metadata.create_all(bind=engine)
    # Ensure columns exist on existing tables
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS error_message TEXT;"))
            conn.execute(text("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS summary TEXT;"))
            conn.execute(text("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS key_points JSON;"))
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
app.include_router(meetings_router)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
