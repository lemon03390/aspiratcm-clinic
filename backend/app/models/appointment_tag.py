from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class AppointmentTag(Base):
    """預約與標籤關聯表"""
    __tablename__ = "appointment_tags"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False)
    tag_id = Column(Integer, ForeignKey("tag_types.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())

    # 關聯
    appointment = relationship("Appointment", back_populates="tags")
    tag = relationship("TagType", back_populates="appointments") 