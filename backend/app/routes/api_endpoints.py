from typing import Callable
from functools import wraps
from fastapi import HTTPException, APIRouter, Depends, Query, Path
import logging
from contextlib import contextmanager
from sqlalchemy.orm import Session
from app.api.appointments import build_appointment_dict
from app.db.session import get_db
import asyncio
from sqlalchemy import text

# 設置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# 定義錯誤處理裝飾器
def handle_exceptions(operation_name: str):
    """創建錯誤處理裝飾器，用於統一處理API端點的異常"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
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
def get_appointments(db: Session = Depends(get_db)):
    # 使用聯合查詢獲取預約和醫師資訊
    query = text(f"{get_appointment_query()} ORDER BY a.appointment_time")
    appointments = db.execute(query).fetchall()
    
    # 使用列表推導式簡化代碼
    return [build_appointment_dict(appointment) for appointment in appointments]

def get_appointment_query():
    """生成查詢預約的 SQL 語句"""
    return """
    SELECT a.id, a.patient_name, a.phone_number, d.name as doctor_name, 
           a.appointment_time, a.status, a.next_appointment, 
           a.related_appointment_id, a.consultation_type
    FROM appointments a
    LEFT JOIN doctors d ON a.doctor_id = d.id
    """ 