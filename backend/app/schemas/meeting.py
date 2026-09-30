from datetime import datetime
from pydantic import BaseModel, ConfigDict


class MeetingBase(BaseModel):
    title: str


class MeetingOut(BaseModel):
    id: int
    user_id: int
    title: str
    file_path: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
