from sqlalchemy import Column, Integer, String, DateTime, ARRAY
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.utils.time import now_hk

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    email = Column(String, index=True)
    phone = Column(String)
    schedule = Column(ARRAY(String), server_default='{}', nullable=True)
    created_at = Column(DateTime, default=lambda: now_hk())
    updated_at = Column(DateTime, default=lambda: now_hk(), onupdate=lambda: now_hk())
    
    # 關聯醫療記錄
    medical_records = relationship("MedicalRecord", back_populates="doctor") 