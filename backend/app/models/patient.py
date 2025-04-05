from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Date, Boolean
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.utils.time import now_hk

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    registration_number = Column(String, unique=True, index=True)  # 唯一掛號編號
    chinese_name = Column(String, index=True)
    english_name = Column(String, index=True)
    id_number = Column(String, unique=True, index=True)  # 身份證或護照號碼
    birth_date = Column(Date, nullable=False)
    phone_number = Column(String, nullable=False)
    email = Column(String, nullable=True)
    
    # 健康相關資訊
    basic_diseases = Column(JSON, nullable=True)  # 基礎疾病（JSON數組）
    drug_allergies = Column(JSON, nullable=True)  # 藥物過敏（JSON數組）
    food_allergies = Column(JSON, nullable=True)  # 食物過敏（JSON數組）
    
    # 預約相關
    registration_datetime = Column(DateTime, default=lambda: now_hk())  # 掛號日期時間
    has_appointment = Column(Boolean, default=False)  # 是否已有預約
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    data_source = Column(String, nullable=True)  # 資料來源（朋友介紹、Facebook等）
    
    # 地區資訊
    region = Column(String, nullable=True)  # 香港島/九龍/新界
    district = Column(String, nullable=True)  # 18區
    sub_district = Column(String, nullable=True)  # 更細地區
    
    # 系統欄位
    created_at = Column(DateTime, default=lambda: now_hk())
    updated_at = Column(DateTime, default=lambda: now_hk(), onupdate=lambda: now_hk())
    
    # 關聯
    doctor = relationship("Doctor", backref="patients")
    
    # 關聯預約
    appointments = relationship("Appointment", primaryjoin="and_(Patient.chinese_name==Appointment.patient_name, "
                                               "Patient.phone_number==Appointment.phone_number)",
                               foreign_keys="[Appointment.patient_name, Appointment.phone_number]",
                               uselist=True, viewonly=True) 