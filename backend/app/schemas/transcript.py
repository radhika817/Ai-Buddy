from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class TranscriptSegmentBase(BaseModel):
    start_time: float
    end_time: float
    text: str
    speaker: Optional[str] = None
    edited: bool = False


class TranscriptSegmentOut(BaseModel):
    id: int
    meeting_id: int
    start_time: float
    end_time: float
    text: str
    speaker: Optional[str] = None
    edited: bool = False

    model_config = ConfigDict(from_attributes=True)


class TranscriptSegmentUpdate(BaseModel):
    text: Optional[str] = None
    speaker: Optional[str] = None


class SpeakerRenameRequest(BaseModel):
    old_name: str = Field(..., min_length=1)
    new_name: str = Field(..., min_length=1)

    @field_validator("old_name", "new_name")
    @classmethod
    def validate_names(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Speaker name cannot be empty.")
        return cleaned

