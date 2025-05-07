from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TagTypeBase(BaseModel):
    """標籤基礎模型"""
    name: str = Field(..., description="標籤名稱")
    description: Optional[str] = Field(None, description="標籤描述")
    color: str = Field("blue", description="標籤顏色")
    icon: Optional[str] = Field(None, description="標籤圖示")
    is_active: bool = Field(True, description="是否啟用")


class TagTypeCreate(TagTypeBase):
    """建立標籤模型"""
    pass


class TagTypeUpdate(TagTypeBase):
    """更新標籤模型"""
    name: Optional[str] = Field(None, description="標籤名稱")
    is_active: Optional[bool] = Field(None, description="是否啟用")


class TagTypeInDB(TagTypeBase):
    """資料庫中的標籤模型"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class TagType(TagTypeInDB):
    """對外的標籤模型"""
    pass 