from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, time, timedelta
from app.db import get_db
from app.models import AppointmentSlot, Appointment, Doctor
from app.schemas.appointment_slots import (
    SlotCreate, SlotUpdate, SlotResponse, 
    DailyCapacityResponse, TimeSlotCapacity
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=SlotResponse)
async def create_slot(slot: SlotCreate, db: Session = Depends(get_db)):
    """創建新的預約時段設定"""
    # 檢查醫師是否存在
    if not db.query(Doctor).filter(Doctor.id == slot.doctor_id).first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"醫師 ID {slot.doctor_id} 不存在"
        )
    
    # 檢查是否有重疊的時段
    if overlapping := db.query(AppointmentSlot).filter(
        AppointmentSlot.doctor_id == slot.doctor_id,
        AppointmentSlot.day_of_week == slot.day_of_week,
        AppointmentSlot.start_time < slot.end_time,
        AppointmentSlot.end_time > slot.start_time,
        AppointmentSlot.is_active == True
    ).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="此時段與現有時段重疊"
        )
    
    # 創建新時段
    db_slot = AppointmentSlot(
        day_of_week=slot.day_of_week,
        start_time=slot.start_time,
        end_time=slot.end_time,
        capacity=slot.capacity,
        doctor_id=slot.doctor_id,
        is_active=True,
        slot_config=slot.slot_config
    )
    
    db.add(db_slot)
    db.commit()
    db.refresh(db_slot)
    return db_slot

@router.get("/daily-capacity", response_model=List[DailyCapacityResponse])
async def get_daily_capacity(
    date_from: datetime,
    date_to: datetime,
    doctor_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """獲取指定日期範圍內的預約容量"""
    # 檢查日期範圍是否合理（最多30天）
    if (date_to - date_from).days > 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="日期範圍不能超過30天"
        )
    
    result = []
    current_date = date_from
    while current_date <= date_to:
        day_of_week = current_date.weekday()
        
        # 查詢當天可用時段
        query = db.query(AppointmentSlot).filter(
            AppointmentSlot.day_of_week == day_of_week,
            AppointmentSlot.is_active == True
        )
        
        if doctor_id:
            query = query.filter(AppointmentSlot.doctor_id == doctor_id)
        
        slots = query.all()
        
        # 為每個時段查詢已預約數量
        time_slots = []
        for slot in slots:
            # 創建當天的時間範圍
            slot_start = datetime.combine(current_date, slot.start_time)
            slot_end = datetime.combine(current_date, slot.end_time)
            
            # 查詢此時段已有的預約數量
            booked_count = db.query(Appointment).filter(
                Appointment.doctor_id == slot.doctor_id,
                Appointment.appointment_time >= slot_start,
                Appointment.appointment_time < slot_end,
                Appointment.status.in_(["未應診", "已到診"])
            ).count()
            
            # 獲取醫師資訊
            doctor = db.query(Doctor).filter(Doctor.id == slot.doctor_id).first()
            doctor_name = doctor.name if doctor else "未知醫師"
            
            # 添加時段容量資訊
            time_slots.append(TimeSlotCapacity(
                start_time=slot.start_time.strftime("%H:%M"),
                end_time=slot.end_time.strftime("%H:%M"),
                capacity=slot.capacity,
                booked=booked_count,
                available=max(0, slot.capacity - booked_count),
                doctor_id=slot.doctor_id,
                doctor_name=doctor_name
            ))
        
        # 添加當天容量概況
        result.append(DailyCapacityResponse(
            date=current_date.date(),
            day_of_week=day_of_week,
            day_name=["週一", "週二", "週三", "週四", "週五", "週六", "週日"][day_of_week],
            time_slots=time_slots
        ))
        
        current_date += timedelta(days=1)
    
    return result
