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

        # 防禦性編程，清理可能有問題的字段
        if hasattr(patient, 'basic_diseases') and patient.basic_diseases is None:
            patient.basic_diseases = []

        if hasattr(patient, 'drug_allergies') and patient.drug_allergies is None:
            patient.drug_allergies = []

        if hasattr(patient, 'food_allergies') and patient.food_allergies is None:
            patient.food_allergies = []

        if hasattr(patient, 'health_profile') and patient.health_profile is None:
            patient.health_profile = {}

        # 檢查患者是否有醫療記錄且包含可能有問題的字段
        # 強化處理醫療記錄中可能存在的問題欄位
        for medical_record in getattr(patient, 'medical_records', []):
            # 檢查並清理 observation 欄位
            if hasattr(medical_record, 'observation'):
                # 判斷 observation 是否為空物件或 None
                if medical_record.observation is None or medical_record.observation == {} or (
                    isinstance(medical_record.observation, dict) and len(medical_record.observation) == 0
                ):
                    medical_record.observation = ""
                # 如果是物件但非空，嘗試轉為 JSON 字串
                elif isinstance(medical_record.observation, dict):
                    try:
                        medical_record.observation = json.dumps(medical_record.observation)
                    except Exception as e:
                        logger.warning(f"轉換 observation 為 JSON 字串時出錯: {str(e)}")
                        medical_record.observation = ""

            # 檢查診斷記錄，確保它始終是有效的資料結構
            for diagnosis in getattr(medical_record, 'diagnoses', []):
                if hasattr(diagnosis, 'modern_diseases'):
                    if diagnosis.modern_diseases is None:
                        diagnosis.modern_diseases = []
                    elif not isinstance(diagnosis.modern_diseases, list):
                        try:
                            # 嘗試將非列表轉為列表
                            diagnosis.modern_diseases = [diagnosis.modern_diseases]
                        except Exception:
                            diagnosis.modern_diseases = []
                
                if hasattr(diagnosis, 'cm_syndromes'):
                    if diagnosis.cm_syndromes is None:
                        diagnosis.cm_syndromes = []
                    elif not isinstance(diagnosis.cm_syndromes, list):
                        try:
                            # 嘗試將非列表轉為列表
                            diagnosis.cm_syndromes = [diagnosis.cm_syndromes]
                        except Exception:
                            diagnosis.cm_syndromes = []

        logger.info(f"成功查詢到電話號碼為 {formatted_phone} 的患者資料")
        return patient
    except HTTPException:
        # 直接重新拋出 HTTP 異常
        raise
    except Exception as e:
        logger.error(f"查詢電話號碼為 {phone} 的患者資料時出錯: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢患者資料失敗: {str(e)}",
        ) from e 