from fastapi import APIRouter, HTTPException, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any, Callable
from pydantic import BaseModel
from datetime import datetime
from app.db.session import get_db
from app.models import Appointment, Doctor
import logging
import json
import asyncio
from contextlib import contextmanager
from functools import wraps

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

# 預約查詢 SQL 生成函數
def get_appointment_query(join_type: str = "LEFT", condition: str = "") -> str:
    """生成查詢預約的SQL語句，可選條件子句"""
    base_query = f"""
    SELECT a.id, a.patient_name, a.phone_number, d.name as doctor_name, 
           a.appointment_time, a.status, a.next_appointment, 
           a.related_appointment_id, a.consultation_type, a.created_at, a.updated_at
    FROM appointments a
    {join_type} JOIN doctors d ON a.doctor_id = d.id
    """
    return f"{base_query}{f' WHERE {condition}' if condition else ''}"

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
        "appointment_time": appointment[4],
        "status": appointment[5],
        "next_appointment": appointment[6],
        "related_appointment_id": appointment[7],
        "consultation_type": consultation_type,
        "created_at": appointment[9],
        "updated_at": appointment[10],
        "is_first_time": 0,
        "is_troublesome": 0,
        "is_contagious": 0
    }

# 創建一個處理consultation_type的函數來減少重複代碼
def parse_consultation_type(data) -> Optional[Dict[str, Any]]:
    """解析consultation_type數據，處理可能的格式和錯誤"""
    if not data:
        return None
        
    try:
        return json.loads(data) if isinstance(data, str) else data
    except Exception as e:
        logger.error(f"解析consultation_type時出錯: {e}")
        return None

# 定義錯誤處理裝飾器
def handle_exceptions(operation_name: str):
    """創建錯誤處理裝飾器，用於統一處理API端點的異常"""
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                error_message = f"{operation_name}時出錯: {str(e)}"
                logger.error(error_message)
                raise HTTPException(status_code=500, detail=error_message)
        return wrapper
    return decorator

# 定義上下文管理器用於數據庫事務
@contextmanager
def db_transaction(db: Session):
    """創建數據庫事務上下文管理器，用於自動提交或回滾事務"""
    try:
        yield
        db.commit()
    except Exception as e:
        db.rollback()
        raise e

# 獲取所有預約的API端點
@router.get("")
@handle_exceptions("獲取預約列表")
def get_appointments(request: Request, db: Session = Depends(get_db)):
    # 使用聯合查詢獲取預約和醫師資訊
    query = text(f"{get_appointment_query()} ORDER BY a.appointment_time")
    try:
        appointments = db.execute(query).fetchall()
        # 使用列表推導式簡化代碼
        return [build_appointment_dict(appointment) for appointment in appointments]
    except Exception as e:
        logger.error(f"獲取預約列表時出錯: {str(e)}")
        raise e 