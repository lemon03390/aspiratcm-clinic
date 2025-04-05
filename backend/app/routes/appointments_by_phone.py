from fastapi import APIRouter, HTTPException, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from database import get_db
import logging

# 設置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/by-phone/{phone_number}")
async def get_appointment_by_phone(phone_number: str, db: Session = Depends(get_db)):
    """根據電話號碼查詢預約"""
    try:
        # 使用預約查詢語句並添加電話號碼條件
        query = text("""
        SELECT a.id, a.patient_name, a.phone_number, d.name as doctor_name, 
               a.appointment_time, a.status, a.next_appointment, 
               a.related_appointment_id, a.consultation_type, a.created_at, a.updated_at
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        WHERE a.phone_number = :phone_number
        ORDER BY a.appointment_time DESC
        """)
        
        appointments = db.execute(query, {"phone_number": phone_number}).fetchall()
        
        if not appointments:
            raise HTTPException(status_code=404, detail=f"未找到電話號碼為 {phone_number} 的預約")
        
        # 導入構建字典的函數
        from routes.appointments import build_appointment_dict
        
        # 返回所有符合條件的預約
        return [build_appointment_dict(appointment) for appointment in appointments]
    except Exception as e:
        logger.error(f"按電話號碼查詢預約時出錯: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"按電話號碼查詢預約時出錯: {str(e)}") from e 

@router.get("/by-phone")
async def get_appointment_by_phone_query(request: Request, phone_number: str = Query(..., description="患者電話號碼"), db: Session = Depends(get_db)):
    """根據電話號碼查詢參數查詢預約"""
    return await get_appointments_by_phone_number(phone_number, db) 