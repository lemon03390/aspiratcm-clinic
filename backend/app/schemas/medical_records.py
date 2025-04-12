from pydantic import BaseModel, validator, Field
from typing import List, Optional, Dict, Any
import json
import os

# 獲取當前目錄路徑，確保可以正確載入 JSON 檔案
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")

# 預先載入可接受的 syndrome code（來自已生成的 JSON）
try:
    with open(os.path.join(DATA_DIR, "cm_syndrime_syndrome_code_mapping.json"), "r", encoding="utf-8") as f:
        CODE_MAP = json.load(f)
        ALLOWED_CODES = set(CODE_MAP.values())
except Exception as e:
    print(f"警告：無法載入證候代碼映射：{str(e)}")
    CODE_MAP = {}
    ALLOWED_CODES = set()

class SyndromeInfo(BaseModel):
    """證候詳細資訊模型"""
    code: str
    name: str
    aliases: List[str] = []

class DiagnosisCreate(BaseModel):
    """診斷創建模型"""
    modern_diseases: List[str] = []
    cm_syndromes: List[str] = []
    cm_principle: Optional[str] = None

    @validator("cm_syndromes", each_item=True)
    def validate_syndrome_code(cls, v):
        if ALLOWED_CODES and v not in ALLOWED_CODES:
            raise ValueError(f"證候代碼 {v} 無效")
        return v

class DiagnosisUpdate(BaseModel):
    """診斷更新模型"""
    modern_diseases: Optional[List[str]] = None
    cm_syndromes: Optional[List[str]] = None
    cm_principle: Optional[str] = None

    @validator("cm_syndromes", each_item=True)
    def validate_syndrome_code(cls, v):
        if ALLOWED_CODES and v not in ALLOWED_CODES:
            raise ValueError(f"證候代碼 {v} 無效")
        return v

class DiagnosisResponse(BaseModel):
    """診斷回應模型，用於 API 回傳資料"""
    id: int
    modern_diseases: List[str] = []
    cm_syndromes: List[str] = []
    cm_principle: Optional[str] = None
    # 擴展字段，用於前端顯示
    cm_syndromes_info: Optional[List[SyndromeInfo]] = Field(None, exclude=True)

    class Config:
        from_attributes = True 