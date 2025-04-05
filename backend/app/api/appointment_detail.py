from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any
from datetime import datetime
import json
import logging
import asyncio

from app.db.database import get_db
from app.api.appointments import parse_consultation_type

# 設置日誌
logger = logging.getLogger(__name__)

router = APIRouter()

# 創建一個裝飾器來處理異常
def handle_exceptions(operation_name: str):
    """用於處理路由中異常的裝飾器"""
    def decorator(func):
        from functools import wraps
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
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
        "appointment_time": appointment[4],
        "status": appointment[5],
        "next_appointment": appointment[6],
        "related_appointment_id": appointment[7],
        "consultation_type": consultation_type,
        "created_at": appointment[9],
        "updated_at": appointment[10],
        "is_first_time": appointment[11] if len(appointment) > 11 else 0,
        "is_troublesome": appointment[12] if len(appointment) > 12 else 0,
        "is_contagious": appointment[13] if len(appointment) > 13 else 0
    }

# 生成預約查詢 SQL
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

@router.get("/{id}")
@handle_exceptions("獲取預約詳情")
async def get_appointment(id: int, db: Session = Depends(get_db)):
    """根據預約 ID 獲取預約詳情"""
    logger.info(f"請求獲取預約 ID: {id}")
    
    # 使用預約查詢函數構建SQL查詢
    query_string = get_appointment_query("LEFT", "a.id = :id")
    
    logger.info(f"SQL查詢: {query_string}")
    
    query = text(query_string)
    appointment = db.execute(query, {"id": id}).fetchone()
    
    # 如果沒有找到預約，返回404錯誤
    if not appointment:
        logger.warning(f"未找到 ID 為 {id} 的預約")
        raise HTTPException(status_code=404, detail=f"未找到 ID 為 {id} 的預約")
    
    # 解析求診類型
    consultation_type = parse_consultation_type(appointment[8])
    
    # 構建返回數據
    appointment_dict = build_appointment_dict(appointment, consultation_type)
    logger.info(f"已獲取預約資訊: ID={id}")
    
    return appointment_dict 