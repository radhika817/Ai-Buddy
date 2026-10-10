from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, field_validator


class MeetingBase(BaseModel):
    title: str


class MeetingOut(BaseModel):
    id: int
    user_id: int
    title: str
    file_path: str
    status: str
    summary: Optional[str] = None
    key_points: Optional[List[str]] = None
    error_message: Optional[str] = None
    indexed: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MeetingUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Title cannot be empty.")
        if len(cleaned) > 120:
            raise ValueError("Title must be at most 120 characters.")
        return cleaned

