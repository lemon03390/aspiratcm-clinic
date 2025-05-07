from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List, Any, Dict
import re
import logging
import json

from app.db import get_db
from app.models import Patient
from app.api.patient_registration import PatientResponse

# 設置日誌
logger = logging.getLogger(__name__)
router = APIRouter()

def sanitize_patient_data(patient: Patient) -> Patient:
    """清理並標準化患者資料中的欄位"""
    # 清理基本欄位
    for field in ['basic_diseases', 'drug_allergies', 'food_allergies']:
        if hasattr(patient, field) and getattr(patient, field) is None:
            setattr(patient, field, [])
    
    # 清理健康檔案
    if hasattr(patient, 'health_profile') and patient.health_profile is None:
        patient.health_profile = {}
    
    # 處理醫療記錄
    for record in getattr(patient, 'medical_records', []):
        # 處理觀察欄位
        if hasattr(record, 'observation'):
            if record.observation is None or record.observation == {} or (
                isinstance(record.observation, dict) and len(record.observation) == 0
            ):
                record.observation = ""
            elif isinstance(record.observation, dict):
                try:
                    record.observation = json.dumps(record.observation)
                except Exception as e:
                    logger.warning(f"轉換 observation 為 JSON 字串時出錯: {str(e)}")
                    record.observation = ""
        
        # 處理診斷記錄
        for diagnosis in getattr(record, 'diagnoses', []):
            for field in ['modern_diseases', 'cm_syndromes']:
                if hasattr(diagnosis, field):
                    field_value = getattr(diagnosis, field)
                    if field_value is None:
                        setattr(diagnosis, field, [])
                    elif not isinstance(field_value, list):
                        try:
                            setattr(diagnosis, field, [field_value])
                        except Exception:
                            setattr(diagnosis, field, [])
    
    return patient

@router.get("/by-phone-number", response_model=PatientResponse)
async def get_patient_by_phone_number(
    phone: str = Query(..., description="患者電話號碼"), 
    db: Session = Depends(get_db)
):
    """通過電話號碼查詢患者資料 (兼容舊格式查詢，URL參數方式)"""
    try:
        # 格式化電話號碼，移除特殊字符
        formatted_phone = re.sub(r'[\s\-\(\)]', '', phone)
        logger.info(f"正在查詢電話號碼 {formatted_phone} 的患者資料")

        # 獲取患者資料
        patient = db.query(Patient).filter(Patient.phone_number == formatted_phone).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"電話號碼為 {phone} 的患者不存在"
            )

        # 清理並標準化資料
        patient = sanitize_patient_data(patient)
        
        logger.info(f"成功查詢到電話號碼為 {formatted_phone} 的患者資料")
        return patient
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"查詢電話號碼為 {phone} 的患者資料時出錯: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢患者資料失敗: {str(e)}",
        ) from e 