from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    task = Column(Text, nullable=False)
    assigned_to = Column(String, nullable=True)
    deadline_text = Column(String, nullable=True)
    deadline_date = Column(Date, nullable=True)
    status = Column(String, default="pending", nullable=False)  # "pending", "done"
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    meeting = relationship("Meeting", back_populates="action_items")
