from typing import Dict, Any, Optional
import json
import logging

# 設置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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