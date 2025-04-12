from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.utils.time import now_hk

class WaitingList(Base):
    __tablename__ = "waiting_list"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    registration_number = Column(String, nullable=False, index=True)
    chinese_name = Column(String, nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: now_hk(), index=True)
    
    # 關聯
    patient = relationship("Patient", backref="waiting_list_entries")
    doctor = relationship("Doctor", backref="waiting_patients") 