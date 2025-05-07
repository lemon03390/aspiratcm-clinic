from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from app.db.session import get_db
from app.utils.time import now_hk, to_hk
import logging
import pytz # type: ignore

# 設置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(request: Request, db: Session = Depends(get_db)):
    """獲取儀表板統計數據，包括今日預約和預約容量"""
    try:
        # 獲取目前香港時間
        now = now_hk()
        logger.info(f"當前香港時間: {now}")
        
        # 使用日期字符串，確保一致性
        today_date_str = now.strftime("%Y-%m-%d")
        logger.info(f"今日日期字符串: {today_date_str}")
        
        # 查詢今日預約數量，使用 DATE 函數直接比較日期，避免時區問題
        today_appointments_query = text("""
            SELECT COUNT(*) 
            FROM appointments 
            WHERE DATE(appointment_time) = DATE(:current_date)
            AND status != '已取消'
        """)
        
        # 執行查詢
        today_appointments_count = db.execute(
            today_appointments_query, 
            {"current_date": today_date_str}
        ).scalar() or 0
        
        logger.info(f"查詢今日預約數量: {today_appointments_count}, 使用日期: {today_date_str}")
        
        # 詳細查看今日預約
        debug_query = text("""
            SELECT id, patient_name, appointment_time, status 
            FROM appointments 
            WHERE DATE(appointment_time) = DATE(:current_date)
            ORDER BY appointment_time
        """)
        
        debug_results = db.execute(debug_query, {"current_date": today_date_str}).fetchall()
        logger.info(f"今日預約詳情 (共{len(debug_results)}筆):")
        for appt in debug_results:
            logger.info(f"ID: {appt[0]}, 姓名: {appt[1]}, 時間: {appt[2]}, 狀態: {appt[3]}")
        
        # 查詢所有醫生的數量
        doctors_count_query = text("SELECT COUNT(*) FROM doctors WHERE name != '已離職醫師'")
        doctors_count = db.execute(doctors_count_query).scalar() or 0
        logger.info(f"在職醫師數量: {doctors_count}")
        
        # 查詢預約容量設置
        capacity_query = text("""
            SELECT COALESCE(SUM(capacity), 0) 
            FROM appointment_slots
            WHERE day_of_week = :day_of_week
        """)
        
        # 獲取今天是星期幾（0是星期一，6是星期日）
        weekday = now.weekday()
        logger.info(f"今天是星期{weekday+1}")
        
        # 嘗試從設置表中獲取容量
        try:
            capacity = db.execute(
                capacity_query,
                {"day_of_week": weekday}
            ).scalar() or 0
        except Exception as e:
            logger.warning(f"查詢容量設置時出錯，將使用默認值: {str(e)}")
            capacity = 0
        
        # 如果容量是0，使用每個醫生的默認容量（10）
        if capacity == 0:
            capacity = doctors_count * 10
            logger.info(f"使用默認容量計算: {doctors_count} 醫師 × 10 = {capacity}")
        else:
            logger.info(f"使用配置容量: {capacity}")
        
        # 構建返回數據
        result = {
            "today_appointments": {
                "count": today_appointments_count,
                "date": today_date_str
            },
            "capacity": {
                "total": capacity,
                "available": capacity - today_appointments_count if capacity > today_appointments_count else 0,
                "doctors_count": doctors_count
            }
        }
        
        logger.info(f"儀表板統計結果: {result}")
        return result
    except Exception as e:
        logger.error(f"獲取儀表板統計數據時出錯: {str(e)}")
        return {
            "today_appointments": {
                "count": 0,
                "date": now_hk().strftime("%Y-%m-%d")
            },
            "capacity": {
                "total": 0,
                "available": 0,
                "doctors_count": 0
            },
            "error": str(e)
        } 