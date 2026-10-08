from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator


class ActionItemBase(BaseModel):
    task: str
    assigned_to: Optional[str] = None
    deadline_text: Optional[str] = None


class ActionItemUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        clean = v.strip().lower()
        if clean not in ("pending", "done"):
            raise ValueError("status must be either 'pending' or 'done'")
        return clean


class ActionItemOut(BaseModel):
    id: int
    meeting_id: int
    task: str
    assigned_to: Optional[str] = None
    deadline_text: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
