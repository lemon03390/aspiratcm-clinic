from fastapi import APIRouter, Depends, Query, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
import json
import requests
from app.db import get_db
from app.routes.appointments import get_tomorrow_appointments
from app.utils.time import now_hk
from pydantic import BaseModel
from typing import List, Optional
import logging
import os

logger = logging.getLogger(__name__)
router = APIRouter()

# WhatsApp 提醒訊息模板
APPOINTMENT_REMINDER_TEMPLATE = """
您好，{patient_name}！
提醒您，您明天({appointment_date})有預約{doctor_name}醫師的診症。
時間：{appointment_time}
地點：安世藥方中醫診所 (九龍觀塘成業街7號寧晉中心11樓B室)
如需更改預約，請致電 2153 1882
"""

class WhatsAppConfig(BaseModel):
    api_key: str
    business_phone_id: str
    template_id: str
    base_url: str = "https://graph.facebook.com/v17.0"

# 從環境變數獲取 WhatsApp 配置
def get_whatsapp_config() -> WhatsAppConfig:
    return WhatsAppConfig(
        api_key=os.getenv("WHATSAPP_API_KEY", ""),
        business_phone_id=os.getenv("WHATSAPP_BUSINESS_PHONE_ID", ""),
        template_id=os.getenv("WHATSAPP_TEMPLATE_ID", "appointment_reminder")
    )

# 發送單條 WhatsApp 消息
def send_whatsapp_message(phone_number: str, message: str, config: WhatsAppConfig):
    try:
        headers = {
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json"
        }
        
        # 確保電話號碼格式正確（去除空格和連字符）
        formatted_phone = phone_number.replace(" ", "").replace("-", "")
        
        # 如果沒有國家代碼，添加香港國家代碼
        if not formatted_phone.startswith("+"):
            formatted_phone = f"+852{formatted_phone}"
        
        payload = {
            "messaging_product": "whatsapp",
            "to": formatted_phone,
            "type": "text",
            "text": {
                "body": message
            }
        }
        
        url = f"{config.base_url}/{config.business_phone_id}/messages"
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code != 200:
            logger.error(f"WhatsApp API 請求失敗: {response.text}")
            return {"success": False, "error": response.text}
        
        return {"success": True, "response": response.json()}
    except Exception as e:
        logger.error(f"發送 WhatsApp 訊息時出錯: {str(e)}")
        return {"success": False, "error": str(e)}

# 批量發送明日預約提醒
@router.post("/send-tomorrow-reminders")
async def send_tomorrow_reminders(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    try:
        # 獲取 WhatsApp 配置
        whatsapp_config = get_whatsapp_config()
        
        if not whatsapp_config.api_key or not whatsapp_config.business_phone_id:
            raise HTTPException(
                status_code=400,
                detail="WhatsApp API 配置不完整，請檢查環境變數設置"
            )
        
        # 獲取明日預約
        tomorrow_appointments = get_tomorrow_appointments(request, db)
        
        if not tomorrow_appointments:
            return {"message": "明日沒有預約，無需發送提醒"}
        
        # 非同步發送提醒
        background_tasks.add_task(
            process_appointment_reminders,
            tomorrow_appointments,
            whatsapp_config
        )
        
        return {
            "message": f"已開始發送 {len(tomorrow_appointments)} 條預約提醒",
            "pending_reminders": len(tomorrow_appointments)
        }
    except Exception as e:
        logger.error(f"批量發送提醒時出錯: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"批量發送提醒時出錯: {str(e)}"
        ) from e

# 處理批量發送預約提醒
def process_appointment_reminders(appointments, whatsapp_config: WhatsAppConfig):
    results = []
    
    for appointment in appointments:
        try:
            # 格式化日期時間
            appointment_datetime = appointment.get("appointment_time")
            if isinstance(appointment_datetime, str):
                from datetime import datetime
                appointment_datetime = datetime.fromisoformat(appointment_datetime.replace('Z', '+00:00'))
            
            appointment_date = appointment_datetime.strftime("%Y年%m月%d日")
            appointment_time = appointment_datetime.strftime("%H:%M")
            
            # 構建提醒訊息
            message = APPOINTMENT_REMINDER_TEMPLATE.format(
                patient_name=appointment.get("patient_name", "患者"),
                appointment_date=appointment_date,
                doctor_name=appointment.get("doctor_name", ""),
                appointment_time=appointment_time
            )
            
            # 發送 WhatsApp 訊息
            result = send_whatsapp_message(
                appointment.get("phone_number", ""),
                message,
                whatsapp_config
            )
            
            results.append({
                "patient_name": appointment.get("patient_name"),
                "phone_number": appointment.get("phone_number"),
                "success": result.get("success", False),
                "error": result.get("error", None)
            })
            
            # 稍微延遲避免 API 限制
            import time
            time.sleep(0.5)
            
        except Exception as e:
            logger.error(f"處理預約提醒時出錯: {str(e)}")
            results.append({
                "patient_name": appointment.get("patient_name", "未知"),
                "phone_number": appointment.get("phone_number", "未知"),
                "success": False,
                "error": str(e)
            })
    
    # 記錄發送結果
    logger.info(f"批量發送預約提醒結果: {json.dumps(results)}")
    return results

# 取消/延期提醒
@router.post("/send-cancellation-notice")
async def send_cancellation_notice(
    patient_name: str = Query(..., description="患者姓名"),
    phone_number: str = Query(..., description="電話號碼"),
    original_date: str = Query(..., description="原預約日期 (YYYY-MM-DD)"),
    new_date: Optional[str] = Query(None, description="新預約日期 (YYYY-MM-DD)"),
    reason: Optional[str] = Query(None, description="取消/延期原因"),
    db: Session = Depends(get_db)
):
    try:
        whatsapp_config = get_whatsapp_config()
        
        # 構建訊息
        if new_date:
            message = f"""
您好，{patient_name}！
很抱歉通知您，您原定於{original_date}的預約需要延期至{new_date}。
{f"原因: {reason}" if reason else ""}
如有任何疑問，請致電 2153 1882。
謝謝您的理解和配合。
"""
        else:
            message = f"""
您好，{patient_name}！
很抱歉通知您，您原定於{original_date}的預約需要取消。
{f"原因: {reason}" if reason else ""}
請致電 2153 1882 重新安排預約。
謝謝您的理解和配合。
"""

        # 發送 WhatsApp 訊息
        result = send_whatsapp_message(phone_number, message, whatsapp_config)
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=500,
                detail=f"發送通知失敗: {result.get('error', '未知錯誤')}"
            )
            
        return {
            "message": "取消/延期通知已成功發送",
            "result": result
        }
        
    except Exception as e:
        logger.error(f"發送取消/延期通知時出錯: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"發送取消/延期通知時出錯: {str(e)}"
        ) from e
