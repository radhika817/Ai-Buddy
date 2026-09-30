from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
# Import models to ensure they are registered with Base.metadata
from app.models.user import User  # noqa: F401
from app.models.meeting import Meeting  # noqa: F401
from app.api.meetings import router as meetings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="AI Buddy API",
    description="AI-powered virtual meeting assistant backend",
    version="0.1.0",
    lifespan=lifespan,
)

# Enable CORS for frontend client
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(meetings_router)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
