from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, ARRAY, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base
from datetime import datetime
from typing import List, Optional, Dict, Any
import uuid

class MedicalRecord(Base):
    """病歷主表"""
    __tablename__ = "medical_records"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(String(50), unique=True, index=True, nullable=False, 
                       default=lambda: f"MR-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}")
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    visit_date = Column(DateTime, nullable=False, default=func.now())
    is_first_visit = Column(Boolean, default=False)
    chief_complaint = Column(Text)
    present_illness = Column(Text)
    observation = Column(Text)
    left_pulse = Column(String(100))
    right_pulse = Column(String(100))
    tongue_quality = Column(String(50))
    tongue_shape = Column(String(50))
    tongue_color = Column(String(50))
    tongue_coating = Column(String(50))
    menstruation_start = Column(DateTime, nullable=True)
    menstruation_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    # 關係
    patient = relationship("Patient", back_populates="medical_records")
    doctor = relationship("Doctor", back_populates="medical_records")
    appointment = relationship("Appointment", back_populates="medical_record")
    diagnoses = relationship("Diagnosis", back_populates="medical_record", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="medical_record", cascade="all, delete-orphan")
    treatments = relationship("Treatment", back_populates="medical_record", cascade="all, delete-orphan")


class Diagnosis(Base):
    """診斷記錄表"""
    __tablename__ = "diagnoses"

    id = Column(Integer, primary_key=True, index=True)
    medical_record_id = Column(Integer, ForeignKey("medical_records.id"), nullable=False)
    modern_diseases = Column(ARRAY(String(100)), nullable=True)
    cm_syndromes = Column(ARRAY(String(100)), nullable=True)
    cm_principle = Column(String(100), nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    # 關係
    medical_record = relationship("MedicalRecord", back_populates="diagnoses")


class Prescription(Base):
    """處方記錄表"""
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    medical_record_id = Column(Integer, ForeignKey("medical_records.id"), nullable=False)
    prescription_id = Column(String(50), unique=True, index=True, nullable=False, 
                            default=lambda: f"RX-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}")
    instructions = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    # 關係
    medical_record = relationship("MedicalRecord", back_populates="prescriptions")
    herbs = relationship("HerbItem", back_populates="prescription", cascade="all, delete-orphan")


class HerbItem(Base):
    """中藥項目表"""
    __tablename__ = "herb_items"

    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=False)
    herb_name = Column(String(100), nullable=False)
    amount = Column(String(50), nullable=False)
    unit = Column(String(10), nullable=True, default="g")
    sequence = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    # 關係
    prescription = relationship("Prescription", back_populates="herbs")


class Treatment(Base):
    """治療方法記錄表"""
    __tablename__ = "treatments"

    id = Column(Integer, primary_key=True, index=True)
    medical_record_id = Column(Integer, ForeignKey("medical_records.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    # 關係
    medical_record = relationship("MedicalRecord", back_populates="treatments")
    treatment_items = relationship("TreatmentItem", back_populates="treatment", cascade="all, delete-orphan")


class TreatmentItem(Base):
    """治療方法項目表"""
    __tablename__ = "treatment_items"

    id = Column(Integer, primary_key=True, index=True)
    treatment_id = Column(Integer, ForeignKey("treatments.id"), nullable=False)
    method = Column(String(50), nullable=False)
    target = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    sequence = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    # 關係
    treatment = relationship("Treatment", back_populates="treatment_items")


class ReferenceData(Base):
    """參考資料表 - 用於存儲各類參考資料如中藥名、穴位等"""
    __tablename__ = "reference_data"

    id = Column(Integer, primary_key=True, index=True)
    data_type = Column(String(50), nullable=False, index=True)
    data_key = Column(String(100), nullable=False, index=True)
    data_value = Column(String(200), nullable=False)
    data_description = Column(Text, nullable=True)
    data_extra = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    __table_args__ = {'comment': '儲存各種參考資料，包含中藥名、穴位、脈象等'} 