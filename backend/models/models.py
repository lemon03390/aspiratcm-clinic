from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, ARRAY, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

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
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

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
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    doctor = relationship("Doctor", backref="appointments")
    related_appointment = relationship("Appointment", remote_side=[id], backref="follow_up_appointments") 