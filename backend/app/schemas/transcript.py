from pydantic import BaseModel, ConfigDict


class TranscriptSegmentBase(BaseModel):
    start_time: float
    end_time: float
    text: str


class TranscriptSegmentOut(BaseModel):
    id: int
    meeting_id: int
    start_time: float
    end_time: float
    text: str

    model_config = ConfigDict(from_attributes=True)
