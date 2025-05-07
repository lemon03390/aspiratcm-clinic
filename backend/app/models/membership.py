from sqlalchemy import Boolean, Column, DateTime, Integer, String, func
from sqlalchemy.sql import text

from app.db.base_class import Base


class Membership(Base):
    """會員資料模型，與CSV欄位保持一致。"""
    __tablename__ = "memberships"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, index=True, nullable=True)
    phoneNumber = Column(String, nullable=True)
    contactAddress = Column(String, nullable=True)
    patientName = Column(String, nullable=False)
    hkid = Column(String, nullable=True, unique=True)
    termsConsent = Column(Boolean, default=False)
    haveCard = Column(Boolean, default=False)
    created_at = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"), onupdate=func.now()) 