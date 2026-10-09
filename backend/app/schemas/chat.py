from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Question about the meeting")
    history: Optional[List[ChatMessage]] = Field(
        default_factory=list,
        description="Optional list of previous messages (maximum 6 messages will be used)",
    )


class ChatResponse(BaseModel):
    answer: str
