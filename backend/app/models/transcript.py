from sqlalchemy import Column, Integer, Float, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    text = Column(Text, nullable=False)
    speaker = Column(Text, nullable=True)
    edited = Column(Boolean, default=False, nullable=False)

    meeting = relationship("Meeting", back_populates="transcript_segments")

