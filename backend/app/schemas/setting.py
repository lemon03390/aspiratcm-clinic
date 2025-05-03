from typing import List, Optional
from pydantic import BaseModel, Field


class TcmSettingBase(BaseModel):
    """基礎中醫設定模型"""
    category: str = Field(..., description="設定類別")
    name: str = Field(..., description="名稱")
    aliases: Optional[str] = Field(None, description="別名，以逗號分隔")
    parent_id: Optional[int] = Field(None, description="父級設定ID")


class TcmSettingCreate(TcmSettingBase):
    """創建中醫設定模型"""
    pass


class TcmSettingUpdate(TcmSettingBase):
    """更新中醫設定模型"""
    category: Optional[str] = Field(None, description="設定類別")
    name: Optional[str] = Field(None, description="名稱")


class TcmSettingInDB(TcmSettingBase):
    """資料庫中的中醫設定模型"""
    id: int
    code: Optional[str] = Field(None, description="代碼")

    class Config:
        orm_mode = True


class TcmSettingFull(TcmSettingInDB):
    """完整中醫設定（包含子項）"""
    children: Optional[List["TcmSettingFull"]] = []

    class Config:
        orm_mode = True


# 解決循環引用問題
TcmSettingFull.update_forward_refs()


class CategoryEnum:
    """設定類別列舉"""
    MODERN_DISEASE = "modern_chinese_disease_name"
    CM_SYNDROME = "cm_syndrome"
    TCM_TREATMENT_RULE = "tcm_treatment_rule"
    TCM_TREATMENT_METHOD = "tcm_treatment_method"
    TCM_SINGLE_HERB = "tcm_single_herb"
    REFERRAL_SOURCE = "referral_source"  # 介紹人來源 