from typing import Literal
from pydantic import BaseModel, Field


class FollowUpEmailRequest(BaseModel):
    tone: Literal["formal", "friendly"] = Field(
        "friendly",
        description="Tone of the follow-up email ('friendly' or 'formal')",
    )


class FollowUpEmailResponse(BaseModel):
    subject: str
    body: str
