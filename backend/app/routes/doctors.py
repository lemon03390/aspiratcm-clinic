from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime, timezone
from app.models import Doctor
from app.db.session import get_db
from pydantic import BaseModel
from app.utils.time import now_hk, to_hk
import logging

# 設置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class DoctorBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    schedule: Optional[List[str]] = None

class DoctorCreate(DoctorBase):
    pass

class DoctorResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    schedule: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# 創建一個函數用於構建醫師字典結構，減少重複代碼
def build_doctor_dict(doctor):
    """根據資料庫查詢結果構建標準的醫師字典"""
    return {
        "id": doctor[0],
        "name": doctor[1],
        "email": doctor[2],
        "phone": doctor[3],
        "schedule": doctor[4] or [],
        "created_at": to_hk(doctor[5]) if doctor[5] else None,
        "updated_at": to_hk(doctor[6]) if doctor[6] else None
    }

# 創建通用錯誤處理函數，減少重複代碼
def handle_exception(e, operation_name, db=None):
    """統一處理異常並返回適當的HTTP異常"""
    if isinstance(e, HTTPException):
        logger.error(f"{operation_name}HTTP錯誤: {e.detail}")
        if db:
            db.rollback()
        raise e
    
    error_message = f"{operation_name}時出錯: {str(e)}"
    logger.error(error_message)
    if db:
        db.rollback()
    raise HTTPException(status_code=500, detail=error_message)

@router.get("")
def get_doctors(request: Request, db: Session = Depends(get_db)):
    try:
        # 查詢基本資料，包括 schedule
        query = text("""
        SELECT id, name, email, phone, schedule, created_at, updated_at 
        FROM doctors
        """)
        doctors = db.execute(query).fetchall()
        
        # 構建返回數據
        result = []
        for doctor in doctors:
            doctor_dict = build_doctor_dict(doctor)
            result.append(doctor_dict)
            
        return result
    except Exception as e:
        handle_exception(e, "獲取醫師", db)

@router.post("")
def create_doctor(request: Request, doctor: DoctorCreate, db: Session = Depends(get_db)):
    try:
        # 獲取所有醫師數量，用於生成唯一的電子郵件地址
        count_query = text("SELECT COUNT(*) FROM doctors")
        count_result = db.execute(count_query).fetchone()
        current_count = count_result[0] if count_result else 0
        
        # 確保電子郵件唯一性
        timestamp = now_hk().strftime("%Y%m%d%H%M%S")
        unique_email = f"doctor{current_count+1}_{timestamp}@clinic.com"
        
        # 插入醫師基本信息
        now = now_hk()
        
        # 創建醫師記錄，包括 schedule
        sql = text("""
        INSERT INTO doctors (name, email, phone, schedule, created_at, updated_at)
        VALUES (:name, :email, :phone, :schedule, :created_at, :updated_at)
        RETURNING id
        """)
        
        doctor_data = {
            "name": doctor.name, 
            "email": unique_email, 
            "phone": doctor.phone or "",
            "schedule": doctor.schedule or [],
            "created_at": now,
            "updated_at": now
        }
        
        result = db.execute(sql, doctor_data).fetchone()
        
        doctor_id = result[0]
        db.commit()
        
        # 構建響應
        return {
            "id": doctor_id,
            **doctor_data
        }
    except Exception as e:
        handle_exception(e, "創建醫師", db)

@router.get("/{doctor_id}")
def read_doctor(request: Request, doctor_id: int, db: Session = Depends(get_db)):
    try:
        # 查詢基本資料，包括 schedule
        sql = text("""
        SELECT id, name, email, phone, schedule, created_at, updated_at
        FROM doctors
        WHERE id = :id
        """)
        doctor = db.execute(sql, {"id": doctor_id}).fetchone()
        
        if doctor is None:
            raise HTTPException(status_code=404, detail="醫師不存在")
        
        # 構建響應
        return build_doctor_dict(doctor)
    except Exception as e:
        handle_exception(e, "讀取醫師", db)

@router.put("/{doctor_id}")
def update_doctor(request: Request, doctor_id: int, doctor: DoctorCreate, db: Session = Depends(get_db)):
    try:
        # 先查詢現有醫師信息，以獲取電子郵件地址
        existing_query = text("SELECT email FROM doctors WHERE id = :id")
        existing_result = db.execute(existing_query, {"id": doctor_id}).fetchone()
        
        if not existing_result:
            raise HTTPException(status_code=404, detail="醫師不存在")
        
        existing_email = existing_result[0]
        
        # 更新基本信息，包括 schedule
        now = now_hk()
        update_sql = text("""
        UPDATE doctors
        SET name = :name, phone = :phone, schedule = :schedule, updated_at = :updated_at
        WHERE id = :id
        """)
        
        db.execute(
            update_sql, 
            {
                "id": doctor_id,
                "name": doctor.name,
                "phone": doctor.phone or "",
                "schedule": doctor.schedule or [],
                "updated_at": now
            }
        )
        db.commit()
        
        # 讀取更新後的醫生
        read_sql = text("""
        SELECT id, name, email, phone, schedule, created_at, updated_at
        FROM doctors
        WHERE id = :id
        """)
        updated_doctor = db.execute(read_sql, {"id": doctor_id}).fetchone()
        
        # 構建響應
        return build_doctor_dict(updated_doctor)
    except Exception as e:
        handle_exception(e, "更新醫師", db)

@router.delete("/{doctor_id}")
def delete_doctor(request: Request, doctor_id: int, db: Session = Depends(get_db)):
    try:
        # 檢查醫生是否存在
        check_sql = text("SELECT name FROM doctors WHERE id = :id")
        doctor_result = db.execute(check_sql, {"id": doctor_id}).fetchone()
        
        if doctor_result is None:
            raise HTTPException(status_code=404, detail="醫師不存在")
        
        doctor_name = doctor_result[0]
        logger.info(f"開始處理刪除醫師 ID: {doctor_id}, 名稱: {doctor_name}")
        
        # 檢查是否有關聯的預約
        check_appointments_sql = text("SELECT COUNT(*) FROM appointments WHERE doctor_id = :doctor_id")
        appointments_count = db.execute(check_appointments_sql, {"doctor_id": doctor_id}).fetchone()[0]
        
        # 如果有關聯的預約，將這些預約改為已離職醫師
        if appointments_count > 0:
            logger.info(f"醫師 ID {doctor_id} 有 {appointments_count} 個關聯的預約，將其醫師改為已離職醫師")
            
            # 查找或創建"已離職醫師"記錄
            resigned_doctor_id = get_or_create_resigned_doctor(db)
            
            # 更新所有與此醫師關聯的預約
            update_appointments_sql = text("""
            UPDATE appointments
            SET doctor_id = :new_doctor_id
            WHERE doctor_id = :old_doctor_id
            """)
            
            db.execute(
                update_appointments_sql,
                {
                    "new_doctor_id": resigned_doctor_id,
                    "old_doctor_id": doctor_id
                }
            )
        
        # 刪除醫師記錄
        delete_sql = text("DELETE FROM doctors WHERE id = :id")
        db.execute(delete_sql, {"id": doctor_id})
        db.commit()
        
        return {"message": f"醫師 {doctor_name} 已成功刪除"}
    except Exception as e:
        handle_exception(e, "刪除醫師", db)

# 函數用於獲取或創建"已離職醫師"記錄
def get_or_create_resigned_doctor(db: Session):
    """查找或創建已離職醫師記錄，返回其ID"""
    resigned_doctor_sql = text("SELECT id FROM doctors WHERE name = :name")
    resigned_doctor = db.execute(resigned_doctor_sql, {"name": "已離職醫師"}).fetchone()
    
    if resigned_doctor is None:
        # 創建"已離職醫師"記錄
        logger.info("創建已離職醫師記錄")
        now = now_hk()
        create_resigned_doctor_sql = text("""
        INSERT INTO doctors (name, email, phone, schedule, created_at, updated_at)
        VALUES (:name, :email, :phone, :schedule, :created_at, :updated_at)
        RETURNING id
        """)
        
        resigned_doctor_result = db.execute(
            create_resigned_doctor_sql, 
            {
                "name": "已離職醫師", 
                "email": "resigned@clinic.com", 
                "phone": "",
                "schedule": [],
                "created_at": now,
                "updated_at": now
            }
        ).fetchone()
        
        return resigned_doctor_result[0]
    
    return resigned_doctor[0] 