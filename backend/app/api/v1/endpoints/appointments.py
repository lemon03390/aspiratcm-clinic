from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.tag_type import TagType
from app.db.database import get_db
from app.models.appointment import Appointment
from app.models.tag_type import TagType as TagTypeModel
from app.models.appointment_tag import AppointmentTag

router = APIRouter()

@router.get("/{appointment_id}/tags", response_model=List[TagType])
def get_appointment_tags(appointment_id: int, db: Session = Depends(get_db)):
    """獲取預約的標籤"""
    # 檢查預約是否存在
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if appointment is None:
        raise HTTPException(status_code=404, detail="找不到預約")

    return (
        db.query(TagTypeModel)
        .join(AppointmentTag, AppointmentTag.tag_id == TagTypeModel.id)
        .filter(
            AppointmentTag.appointment_id == appointment_id,
            TagTypeModel.is_active == True,
        )
        .all()
    )
