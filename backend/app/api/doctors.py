from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Any
from datetime import datetime, timezone
from app.models import Doctor
from app.db.session import get_db
from pydantic import BaseModel
import logging
import json

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

class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    schedule: Optional[List[str]] = None

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

# 處理 schedule 轉換為標準格式的函數
def normalize_schedule(schedule: Any) -> List[str]:
    """將各種可能的 schedule 類型轉換為標準的 List[str] 格式"""
    # 處理 None 值
    if schedule is None:
        return []
    
    # 處理列表
    if isinstance(schedule, list):
        # 過濾非字串元素，並轉換成字串
        return [str(item) for item in schedule if item and (isinstance(item, str) or str(item).strip())]
    
    # 處理字串 (可能是 JSON)
    if isinstance(schedule, str):
        try:
            # 嘗試解析 JSON
            parsed = json.loads(schedule)
            return normalize_schedule(parsed) if isinstance(parsed, list) else []
        except json.JSONDecodeError:
            # 不是 JSON，就當作單一項目
            return [schedule] if schedule.strip() else []
    
    # 處理字典或其他類型 - 轉換成空列表
    return []

# 創建一個函數用於構建醫師字典結構，減少重複代碼
def build_doctor_dict(doctor):
    """根據資料庫查詢結果構建標準的醫師字典"""
    # 處理 schedule 欄位，確保返回簡單的列表格式
    schedule = normalize_schedule(doctor[4])
    
    return {
        "id": doctor[0],
        "name": doctor[1],
        "email": doctor[2],
        "phone": doctor[3],
        "schedule": schedule,
        "created_at": doctor[5],
        "updated_at": doctor[6]
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
    raise HTTPException(status_code=500, detail=error_message) from e

# 創建一個裝飾器來處理異常
def handle_exceptions(operation_name: str):
    """用於處理路由中異常的裝飾器"""
    def decorator(func):
        from functools import wraps
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except HTTPException:
                # 直接重新引發 HTTP 異常
                raise
            except Exception as e:
                error_message = f"{operation_name}時出錯: {str(e)}"
                logger.error(error_message)
                raise HTTPException(status_code=500, detail=error_message)
        return wrapper
    return decorator

@router.get("")
def get_doctors(db: Session = Depends(get_db)):
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
            try:
                # 使用通用函數構建醫師字典，已內置處理 schedule 的邏輯
                doctor_dict = build_doctor_dict(doctor)
                result.append(doctor_dict)
            except Exception as e:
                logger.error(f"處理醫師 ID {doctor[0]} 數據時出錯: {str(e)}")
                # 繼續處理其他醫師
            
        return result
    except Exception as e:
        handle_exception(e, "獲取醫師", db)

@router.post("")
def create_doctor(doctor: DoctorCreate, db: Session = Depends(get_db)):
    try:
        # 獲取所有醫師數量，用於生成唯一的電子郵件地址
        count_query = text("SELECT COUNT(*) FROM doctors")
        count_result = db.execute(count_query).fetchone()
        current_count = count_result[0] if count_result else 0
        
        # 確保電子郵件唯一性
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        unique_email = f"doctor{current_count+1}_{timestamp}@clinic.com"
        
        # 處理 schedule，使用通用函數轉換為標準格式
        schedule = normalize_schedule(doctor.schedule)
        logger.info(f"創建醫師，標準化後的排班資料: {schedule}")
        
        # 插入醫師基本信息
        now = datetime.now(timezone.utc)
        
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
            "schedule": schedule,  # 直接使用 Python 列表，SQLAlchemy 會自動轉換
            "created_at": now,
            "updated_at": now
        }
        
        result = db.execute(sql, doctor_data).fetchone()
        
        doctor_id = result[0]
        db.commit()
        
        # 構建響應 - 確保 schedule 是列表形式
        return {
            "id": doctor_id,
            "name": doctor.name,
            "email": unique_email,
            "phone": doctor.phone or "",
            "schedule": schedule,
            "created_at": now,
            "updated_at": now
        }
    except Exception as e:
        handle_exception(e, "創建醫師", db)

@router.get("/{doctor_id}")
@handle_exceptions("讀取醫師")
def read_doctor(doctor_id: int, db: Session = Depends(get_db)):
    """根據醫師 ID 獲取醫師詳情"""
    logger.info(f"請求獲取醫師 ID: {doctor_id}")
    
    # 查詢基本資料，包括 schedule
    sql = text("""
    SELECT id, name, email, phone, schedule, created_at, updated_at
    FROM doctors
    WHERE id = :id
    """)
    doctor = db.execute(sql, {"id": doctor_id}).fetchone()
    
    if doctor is None:
        logger.warning(f"未找到 ID 為 {doctor_id} 的醫師")
        raise HTTPException(status_code=404, detail=f"未找到 ID 為 {doctor_id} 的醫師")
    
    # 構建響應
    doctor_dict = build_doctor_dict(doctor)
    logger.info(f"已獲取醫師資訊: ID={doctor_id}")
    
    return doctor_dict

@router.put("/{doctor_id}")
@handle_exceptions("更新醫師")
def update_doctor(request: Request, doctor_id: int, doctor: DoctorUpdate, db: Session = Depends(get_db)):
    """根據醫師 ID 更新醫師資料，只更新有提供的欄位，email 保持不變"""
    logger.info(f"請求更新醫師 ID: {doctor_id}, 收到的數據: {doctor}")
    
    # 先查詢現有醫師信息
    existing_query = text("SELECT name, email, phone, schedule FROM doctors WHERE id = :id")
    existing_result = db.execute(existing_query, {"id": doctor_id}).fetchone()
    
    if not existing_result:
        logger.warning(f"未找到 ID 為 {doctor_id} 的醫師")
        raise HTTPException(status_code=404, detail=f"未找到 ID 為 {doctor_id} 的醫師")
    
    # 取得現有資料
    existing_name = existing_result[0]
    existing_email = existing_result[1]
    existing_phone = existing_result[2]
    existing_schedule = existing_result[3]
    
    # 只更新有提供的欄位
    update_data = {}
    
    if doctor.name is not None:
        update_data["name"] = doctor.name
        logger.info(f"更新醫師 ID {doctor_id} 的姓名: {doctor.name}")
    else:
        update_data["name"] = existing_name
    
    if doctor.phone is not None:
        update_data["phone"] = doctor.phone
        logger.info(f"更新醫師 ID {doctor_id} 的電話: {doctor.phone}")
    else:
        update_data["phone"] = existing_phone
    
    if doctor.schedule is not None:
        # 處理 schedule，使用通用函數處理各種可能的格式
        schedule = normalize_schedule(doctor.schedule)
        update_data["schedule"] = schedule
        logger.info(f"更新醫師 ID {doctor_id} 的排班: {schedule}")
    else:
        update_data["schedule"] = existing_schedule
    
    # 更新基本信息，包括 schedule
    now = datetime.now(timezone.utc)
    update_sql = text("""
    UPDATE doctors
    SET name = :name, phone = :phone, schedule = :schedule, updated_at = :updated_at
    WHERE id = :id
    """)
    
    try:
        update_data["id"] = doctor_id
        update_data["updated_at"] = now
        
        db.execute(update_sql, update_data)
        db.commit()
        logger.info(f"成功更新醫師資料 ID: {doctor_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"更新醫師失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"更新醫師資料失敗: {str(e)}") from e
    
    # 讀取更新後的醫生
    read_sql = text("""
    SELECT id, name, email, phone, schedule, created_at, updated_at
    FROM doctors
    WHERE id = :id
    """)
    updated_doctor = db.execute(read_sql, {"id": doctor_id}).fetchone()
    
    # 構建響應
    result = build_doctor_dict(updated_doctor)
    logger.info(f"成功更新醫師 ID: {doctor_id}, schedule: {result['schedule']}")
    return result

@router.delete("/{doctor_id}")
@handle_exceptions("刪除醫師")
def delete_doctor(doctor_id: int, db: Session = Depends(get_db)):
    """根據醫師 ID 刪除醫師"""
    logger.info(f"請求刪除醫師 ID: {doctor_id}")
    
    # 檢查醫生是否存在
    check_sql = text("SELECT name FROM doctors WHERE id = :id")
    doctor_result = db.execute(check_sql, {"id": doctor_id}).fetchone()
    
    if doctor_result is None:
        logger.warning(f"未找到 ID 為 {doctor_id} 的醫師")
        raise HTTPException(status_code=404, detail=f"未找到 ID 為 {doctor_id} 的醫師")
    
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
    
    logger.info(f"成功刪除醫師 ID: {doctor_id}，名稱: {doctor_name}")
    return {"message": f"醫師 {doctor_name} 已成功刪除"}

# 函數用於獲取或創建"已離職醫師"記錄
def get_or_create_resigned_doctor(db: Session):
    """查找或創建已離職醫師記錄，返回其ID"""
    resigned_doctor_sql = text("SELECT id FROM doctors WHERE name = :name")
    resigned_doctor = db.execute(resigned_doctor_sql, {"name": "已離職醫師"}).fetchone()
    
    if resigned_doctor is None:
        # 創建"已離職醫師"記錄
        now = datetime.now(timezone.utc)
        create_sql = text("""
        INSERT INTO doctors (name, email, phone, schedule, created_at, updated_at)
        VALUES (:name, :email, :phone, :schedule, :created_at, :updated_at)
        RETURNING id
        """)
        
        resigned_doctor = db.execute(
            create_sql, 
            {
                "name": "已離職醫師",
                "email": "resigned@clinic.com",
                "phone": "",
                "schedule": [],  # 空排班列表
                "created_at": now,
                "updated_at": now
            }
        ).fetchone()
        
        db.commit()
    
    return resigned_doctor[0] 
