from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, ARRAY, JSON, Date, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.utils.time import now_hk

Base = declarative_base()

class AppointmentStatus(enum.Enum):
    WAITING = "未應診"
    VISITED = "已到診"
    MISSING = "失蹤人口"
    RESCHEDULED = "已改期"
    FOLLOW_UP = "預約覆診"

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    email = Column(String, index=True)
    phone = Column(String)
    schedule = Column(ARRAY(String), server_default='{}', nullable=True)
    created_at = Column(DateTime, default=lambda: now_hk())
    updated_at = Column(DateTime, default=lambda: now_hk(), onupdate=lambda: now_hk())

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_name = Column(String, index=True)
    phone_number = Column(String)
    doctor_id = Column(Integer, ForeignKey("doctors.id"))
    appointment_time = Column(DateTime)
    status = Column(String, default="未應診")  # 未應診, 已應診, 已取消, 已改期
    next_appointment = Column(DateTime, nullable=True)
    related_appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    consultation_type = Column(JSON, nullable=True)  # 存儲求診類型和子類型
    is_first_time = Column(Integer, default=0)  # 0: 非首次求診, 1: 首次求診
    is_troublesome = Column(Integer, default=0)  # 0: 非麻煩症患者, 1: 麻煩症患者  
    is_contagious = Column(Integer, default=0)  # 0: 非傳染病患者, 1: 傳染病患者
    created_at = Column(DateTime, default=lambda: now_hk())
    updated_at = Column(DateTime, default=lambda: now_hk(), onupdate=lambda: now_hk())

    doctor = relationship("Doctor", backref="appointments")
    related_appointment = relationship("Appointment", remote_side=[id], backref="follow_up_appointments")

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