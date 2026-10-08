from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DecisionOut(BaseModel):
    id: int
    meeting_id: int
    decision: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
