from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/ai_buddy"
    SECRET_KEY: str = "development-secret-key-replace-in-production"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> List[str]:
        """
        Parses comma-separated or single FRONTEND_URL and adds localhost dev fallbacks.
        """
        origins = {"http://localhost:5173", "http://127.0.0.1:5173"}
        if self.FRONTEND_URL:
            for url in self.FRONTEND_URL.split(","):
                cleaned = url.strip().rstrip("/")
                if cleaned:
                    origins.add(cleaned)
        return list(origins)


settings = Settings()
