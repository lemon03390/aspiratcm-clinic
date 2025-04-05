from fastapi import APIRouter, HTTPException, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any, Callable
from pydantic import BaseModel
from datetime import datetime, timezone
from app.db.database import get_db
from app.models import Appointment, Doctor
import logging
import json
from contextlib import contextmanager
from functools import wraps
from app.utils.time import now_hk, to_hk

# 設置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# 創建一個全局的星期幾映射字典，用於轉換英文星期到中文星期
WEEKDAY_MAPPING = {
    "monday": "星期一",
    "tuesday": "星期二",
    "wednesday": "星期三",
    "thursday": "星期四",
    "friday": "星期五",
    "saturday": "星期六",
    "sunday": "星期日"
}

class ConsultationTypeBase(BaseModel):
    id: str
    label: str
    subType: Optional[dict] = None

class AppointmentBase(BaseModel):
    patient_name: str
    phone_number: str
    doctor_name: str  # 修改為使用醫生名稱而不是ID
    appointment_time: datetime
    consultation_type: Optional[dict] = None  # 修改為接受字典
    is_first_time: Optional[int] = 0
    is_troublesome: Optional[int] = 0
    is_contagious: Optional[int] = 0

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    patient_name: Optional[str] = None
    phone_number: Optional[str] = None
    doctor_name: Optional[str] = None
    appointment_time: Optional[datetime] = None
    status: Optional[str] = None
    next_appointment: Optional[datetime] = None
    related_appointment_id: Optional[int] = None
    consultation_type: Optional[dict] = None
    is_first_time: Optional[int] = None
    is_troublesome: Optional[int] = None
    is_contagious: Optional[int] = None

class AppointmentResponse(BaseModel):
    id: int
    patient_name: str
    phone_number: str
    doctor_name: str
    appointment_time: datetime
    status: str
    next_appointment: Optional[datetime] = None
    related_appointment_id: Optional[int] = None
    consultation_type: Optional[dict] = None
    is_first_time: Optional[int] = 0
    is_troublesome: Optional[int] = 0
    is_contagious: Optional[int] = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # 更新為 Pydantic v2 的寫法

# 創建數據庫事務上下文管理器
@contextmanager
def db_transaction(db: Session):
    """數據庫事務上下文管理器，處理提交和回滾"""
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        raise e

# 創建一個裝飾器來處理異常
def handle_exceptions(operation_name: str):
    """用於處理路由中異常的裝飾器"""
    def decorator(func):
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

# 創建一個函數用於構建預約字典結構，減少重複代碼
def build_appointment_dict(appointment, consultation_type=None) -> Dict[str, Any]:
    """根據資料庫查詢結果構建標準的預約字典"""
    if consultation_type is None:
        consultation_type = parse_consultation_type(appointment[8])
        
    return {
        "id": appointment[0],
        "patient_name": appointment[1],
        "phone_number": appointment[2],
        "doctor_name": appointment[3] or "已離職醫師",
        "appointment_time": to_hk(appointment[4]) if appointment[4] else None,
        "status": appointment[5],
        "next_appointment": to_hk(appointment[6]) if appointment[6] else None,
        "related_appointment_id": appointment[7],
        "consultation_type": consultation_type,
        "created_at": to_hk(appointment[9]) if appointment[9] else None,
        "updated_at": to_hk(appointment[10]) if appointment[10] else None,
        "is_first_time": appointment[11] if len(appointment) > 11 else 0,
        "is_troublesome": appointment[12] if len(appointment) > 12 else 0,
        "is_contagious": appointment[13] if len(appointment) > 13 else 0
    }

# 創建一個處理consultation_type的函數來減少重複代碼
def parse_consultation_type(data) -> Optional[Dict[str, Any]]:
    """解析consultation_type數據，處理可能的格式和錯誤"""
    if not data:
        return None
        
    try:
        return json.loads(data) if isinstance(data, str) else data
    except Exception as e:
        logger.error(f"解析consultation_type時出錯: {str(e)}")
        return None

# 創建一個函數來處理狀態和日期的格式化
def format_status_with_date(status: str, date: datetime) -> str:
    """根據狀態和日期格式化顯示文字"""
    date_str = date.strftime("%m-%d")
    
    status_formats = {
        '已改期': f"已改期至 {date_str}",
        '預約覆診': f"將於 {date_str}覆診"
    }
    
    return status_formats.get(status, status)

# 在各個需要轉換星期幾名稱的地方使用WEEKDAY_MAPPING
def get_weekday_name(day_name: str) -> str:
    """根據英文星期名獲取中文星期名"""
    return WEEKDAY_MAPPING.get(day_name.lower(), "未知星期")

# 預約查詢 SQL 生成函數
def get_appointment_query(join_type: str = "LEFT", condition: str = "") -> str:
    """生成查詢預約的SQL語句，可選條件子句"""
    base_query = f"""
    SELECT a.id, a.patient_name, a.phone_number, d.name as doctor_name, 
           a.appointment_time, a.status, a.next_appointment, 
           a.related_appointment_id, a.consultation_type, a.created_at, a.updated_at,
           a.is_first_time, a.is_troublesome, a.is_contagious
    FROM appointments a
    {join_type} JOIN doctors d ON a.doctor_id = d.id
    """
    return f"{base_query} WHERE {condition}" if condition else base_query

# 驗證醫生排班與預約時間是否匹配
def validate_doctor_schedule(doctor_name: str, doctor_schedule: List[str], appointment_time: datetime, db: Session = None) -> None:
    """驗證醫生排班與預約時間是否匹配，不匹配則拋出HTTP異常"""
    
    # 確保appointment_time是datetime對象
    if isinstance(appointment_time, str):
        if 'Z' in appointment_time or '+' in appointment_time:
            # ISO格式的UTC時間
            appointment_time = datetime.fromisoformat(appointment_time.replace('Z', '+00:00'))
        else:
            # 不帶時區的本地時間
            appointment_time = datetime.fromisoformat(appointment_time)
    
    # 獲取星期幾（英文小寫）
    appointment_day = appointment_time.strftime("%A").lower()
    weekday_name = get_weekday_name(appointment_day)
    
    if doctor_schedule and appointment_day not in doctor_schedule:
        logger.error(f"醫師在{weekday_name}不應診，排班日為：{doctor_schedule}")
        raise HTTPException(status_code=400, detail=f"醫師{doctor_name} {weekday_name}放緊假，麻煩約第二日")

# 將查詢預約的路由移到這裡，確保它在動態路由之前
@router.get("/by-phone")
@handle_exceptions("查詢預約")
def query_appointments(
    request: Request,
    phone_number: str = Query(None), 
    patient: str = Query(None), 
    db: Session = Depends(get_db)
):
    logger.info(f"查詢預約參數: phone={phone_number}, patient={patient}")
    
    # 檢查參數
    if not phone_number and not patient:
        logger.error("缺少必要的查詢參數")
        raise HTTPException(status_code=400, detail="必須提供聯絡電話或患者姓名")
    
    # 構建查詢條件
    conditions = []
    params = {}
    
    if phone_number:
        # 徹底修改電話號碼查詢邏輯
        # 無論長度如何，全部使用精確匹配
        conditions.append("a.phone_number = :phone")
        params["phone"] = phone_number.strip()
        logger.info(f"電話號碼精確匹配: {params['phone']}")
    
    if patient:
        # 使用模糊查詢而不是完全匹配
        conditions.append("a.patient_name LIKE :patient")
        params["patient"] = f"%{patient.strip() or ''}%"
        logger.info(f"患者姓名查詢條件: {params['patient']}")
    
    # 構建 SQL 查詢
    condition_str = " AND ".join(conditions)
    query_string = get_appointment_query("LEFT", condition_str) + " ORDER BY a.appointment_time DESC"
    
    logger.info(f"SQL查詢: {query_string}")
    logger.info(f"查詢參數: {params}")
    
    query = text(query_string)
    appointments = db.execute(query, params).fetchall()
    
    logger.info(f"查詢結果數量: {len(appointments)}")
    
    # 如果沒有找到預約，返回空列表
    if not appointments:
        search_type = "電話號碼" if phone_number else "患者姓名"
        search_value = phone_number or patient
        logger.info(f"未找到包含{search_type} {search_value} 的預約記錄")
        return []
    
    # 構建返回數據
    result = []
    
    for appointment in appointments:
        try:
            appointment_dict = build_appointment_dict(appointment)
            result.append(appointment_dict)
        except Exception as e:
            logger.error(f"處理預約記錄時出錯: {str(e)}")
    
    return result

@router.get("")
@handle_exceptions("獲取預約列表")
def get_appointments(request: Request, db: Session = Depends(get_db)):
    try:
        logger.info("開始獲取預約列表")
        # 使用聯合查詢獲取預約和醫師資訊
        query = text(f"{get_appointment_query()} ORDER BY a.appointment_time")
        appointments = db.execute(query).fetchall()
        logger.info(f"成功獲取 {len(appointments)} 條預約記錄")
        
        # 處理每個預約記錄
        result = []
        for appointment in appointments:
            try:
                appointment_dict = build_appointment_dict(appointment)
                result.append(appointment_dict)
            except Exception as e:
                logger.error(f"處理預約記錄時出錯: {str(e)}")
                continue
        
        return result
    except Exception as e:
        logger.error(f"獲取預約列表時出錯: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取預約列表時出錯: {str(e)}")

@router.post("")
@handle_exceptions("創建預約")
def create_appointment(request: Request, appointment: AppointmentCreate, db: Session = Depends(get_db)):
    with db_transaction(db):
        # 根據醫生名稱查找醫生ID
        doctor_sql = text("SELECT id, schedule FROM doctors WHERE name = :name")
        doctor = db.execute(doctor_sql, {"name": appointment.doctor_name}).fetchone()
        if not doctor:
            raise HTTPException(status_code=404, detail="醫師不存在")
        
        doctor_id = doctor[0]
        doctor_schedule = doctor[1] or []
        
        # 如果 doctor_schedule 是字串（即 Postgres 取出來時係 JSON 字串），就轉回陣列
        if isinstance(doctor_schedule, str):
            try:
                doctor_schedule = json.loads(doctor_schedule)
            except json.JSONDecodeError:
                doctor_schedule = []
        
        # 檢查醫生是否在該日期應診
        # 如果前端發送的是不帶時區的時間，確保將其視為本地時間處理
        appointment_time = appointment.appointment_time
        if isinstance(appointment_time, str) and 'Z' not in appointment_time and '+' not in appointment_time:
            appointment_time = datetime.fromisoformat(appointment_time)
        
        validate_doctor_schedule(
            appointment.doctor_name, 
            doctor_schedule, 
            appointment_time
        )
        
        # 轉換 consultation_type 為 JSON 字符串
        consultation_type_json = json.dumps(appointment.consultation_type) if appointment.consultation_type else None
        
        # 使用參數化查詢插入預約，避免 SQL 注入
        now = now_hk()
        
        sql = text("""
        INSERT INTO appointments (
            patient_name, phone_number, doctor_id, appointment_time, status, 
            consultation_type, is_first_time, is_troublesome, is_contagious, 
            created_at, updated_at
        )
        VALUES (
            :patient_name, :phone_number, :doctor_id, :appointment_time, :status, 
            :consultation_type, :is_first_time, :is_troublesome, :is_contagious, 
            :created_at, :updated_at
        )
        RETURNING id
        """)
        
        params = {
            "patient_name": appointment.patient_name,
            "phone_number": appointment.phone_number,
            "doctor_id": doctor_id,
            "appointment_time": appointment_time,
            "status": "未應診",
            "consultation_type": consultation_type_json,
            "is_first_time": appointment.is_first_time,
            "is_troublesome": appointment.is_troublesome,
            "is_contagious": appointment.is_contagious,
            "created_at": now,
            "updated_at": now
        }
        
        appointment_id = db.execute(sql, params).scalar()
        
        # 構建響應
        return {
            "id": appointment_id,
            "patient_name": appointment.patient_name,
            "phone_number": appointment.phone_number,
            "doctor_name": appointment.doctor_name,
            "appointment_time": appointment_time,
            "status": "未應診",
            "next_appointment": None,
            "related_appointment_id": None,
            "consultation_type": appointment.consultation_type,
            "is_first_time": appointment.is_first_time,
            "is_troublesome": appointment.is_troublesome,
            "is_contagious": appointment.is_contagious,
            "created_at": now,
            "updated_at": now
        }

@router.get("/{appointment_id}")
@handle_exceptions("讀取預約")
def read_appointment(request: Request, appointment_id: int, db: Session = Depends(get_db)):
    sql = text(get_appointment_query("LEFT", "a.id = :id"))
    appointment = db.execute(sql, {"id": appointment_id}).fetchone()
    
    if appointment is None:
        raise HTTPException(status_code=404, detail="預約不存在")
    
    # 解析 consultation_type
    consultation_type = parse_consultation_type(appointment[8])
    
    # 構建響應
    return build_appointment_dict(appointment, consultation_type)

@router.put("/{appointment_id}")
@handle_exceptions("更新預約")
def update_appointment(request: Request, appointment_id: int, appointment: AppointmentUpdate, db: Session = Depends(get_db)):
    with db_transaction(db):
        # 檢查預約是否存在
        check_sql = text("SELECT doctor_id, status FROM appointments WHERE id = :id")
        result = db.execute(check_sql, {"id": appointment_id}).fetchone()
        
        if result is None:
            raise HTTPException(status_code=404, detail="預約不存在")
        
        # 構建更新 SQL 和參數
        original_doctor_id = result[0]
        original_status = result[1]
        update_fields = []
        params: Dict[str, Any] = {"id": appointment_id}
        
        if appointment.patient_name is not None:
            update_fields.append("patient_name = :patient_name")
            params["patient_name"] = appointment.patient_name
            
        if appointment.phone_number is not None:
            update_fields.append("phone_number = :phone_number")
            params["phone_number"] = appointment.phone_number
            
        if appointment.doctor_name is not None:
            # 獲取醫生 ID
            doctor_sql = text("SELECT id, schedule FROM doctors WHERE name = :name")
            doctor = db.execute(doctor_sql, {"name": appointment.doctor_name}).fetchone()
            if not doctor:
                raise HTTPException(status_code=404, detail="醫師不存在")
                
            # 檢查新醫生的排班是否符合預約時間
            appointment_details_sql = text("SELECT appointment_time FROM appointments WHERE id = :id")
            appointment_time = db.execute(appointment_details_sql, {"id": appointment_id}).fetchone()
            
            doctor_id = doctor[0]
            doctor_schedule = doctor[1] or []
            
            validate_doctor_schedule(
                appointment.doctor_name,
                doctor_schedule,
                appointment_time[0]
            )
                
            update_fields.append("doctor_id = :doctor_id")
            params["doctor_id"] = doctor_id
            
        if appointment.appointment_time is not None:
            # 處理前端發送的不帶時區信息的本地時間
            appointment_time = appointment.appointment_time
            if isinstance(appointment_time, str) and 'Z' not in appointment_time and '+' not in appointment_time:
                appointment_time = datetime.fromisoformat(appointment_time)
            
            # 檢查新時間是否符合醫生排班
            doctor_id_to_check = params.get("doctor_id", original_doctor_id)
            doctor_schedule_sql = text("SELECT name, schedule FROM doctors WHERE id = :id")
            
            if doctor_result := db.execute(doctor_schedule_sql, {"id": doctor_id_to_check}).fetchone():
                doctor_name = doctor_result[0]
                doctor_schedule = doctor_result[1] or []
                
                validate_doctor_schedule(
                    doctor_name,
                    doctor_schedule,
                    appointment_time
                )
                
            update_fields.append("appointment_time = :appointment_time")
            params["appointment_time"] = appointment_time
            
        if appointment.status is not None:
            update_fields.append("status = :status")
            params["status"] = appointment.status
            
        if appointment.next_appointment is not None:
            # 處理前端發送的不帶時區信息的本地時間
            next_appointment = appointment.next_appointment
            if isinstance(next_appointment, str) and 'Z' not in next_appointment and '+' not in next_appointment:
                next_appointment = datetime.fromisoformat(next_appointment)
                
            update_fields.append("next_appointment = :next_appointment")
            params["next_appointment"] = next_appointment
            
            # 如果設置了 next_appointment 並且指定了 status
            if appointment.status in ['已改期', '預約覆診']:
                # 移除前面添加的 status 欄位，避免重複賦值
                update_fields = [field for field in update_fields if not field.startswith("status =")]
                
                # 使用格式化函數
                status_with_date = format_status_with_date(appointment.status, next_appointment)
                update_fields.append("status = :status_with_date")
                params["status_with_date"] = status_with_date
            
        if appointment.related_appointment_id is not None:
            update_fields.append("related_appointment_id = :related_appointment_id")
            params["related_appointment_id"] = appointment.related_appointment_id
            
        if appointment.consultation_type is not None:
            update_fields.append("consultation_type = :consultation_type")
            params["consultation_type"] = json.dumps(appointment.consultation_type)
            
        if appointment.is_first_time is not None:
            update_fields.append("is_first_time = :is_first_time")
            params["is_first_time"] = appointment.is_first_time
            
        if appointment.is_troublesome is not None:
            update_fields.append("is_troublesome = :is_troublesome")
            params["is_troublesome"] = appointment.is_troublesome
            
        if appointment.is_contagious is not None:
            update_fields.append("is_contagious = :is_contagious")
            params["is_contagious"] = appointment.is_contagious
        
        if not update_fields:
            return read_appointment(request, appointment_id, db)
        
        # 最後更新 updated_at 欄位
        update_fields.append("updated_at = :updated_at")
        params["updated_at"] = now_hk()
        
        # 如果沒有任何更新，返回成功
        if not update_fields:
            return {"detail": "沒有提供需要更新的欄位"}
        
        # 構建更新 SQL 語句
        update_sql = f"UPDATE appointments SET {', '.join(update_fields)} WHERE id = :id"
        db.execute(text(update_sql), params)
        db.commit()
        
        # 讀取更新後的預約
        sql = text(get_appointment_query("LEFT", "a.id = :id"))
        updated_appointment = db.execute(sql, {"id": appointment_id}).fetchone()
        
        # 返回更新後的預約
        return build_appointment_dict(updated_appointment)

@router.delete("/{appointment_id}")
@handle_exceptions("刪除預約")
def delete_appointment(request: Request, appointment_id: int, db: Session = Depends(get_db)):
    with db_transaction(db):
        # 檢查預約是否存在
        check_sql = text("SELECT 1 FROM appointments WHERE id = :id")
        result = db.execute(check_sql, {"id": appointment_id}).fetchone()
        
        if result is None:
            raise HTTPException(status_code=404, detail="預約不存在")
        
        # 刪除預約
        delete_sql = text("DELETE FROM appointments WHERE id = :id")
        db.execute(delete_sql, {"id": appointment_id})
        
        return {"message": "預約已刪除"} 
