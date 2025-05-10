from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class MemberPlanBase(BaseModel):
    """增值計劃基礎模型"""
    name: str
    description: Optional[str] = None
    base_amount: float
    bonus_amount: float = 0.0
    is_active: bool = True
    sort_order: int = 0


class MemberPlanCreate(MemberPlanBase):
    """建立增值計劃的模型"""
    pass


class MemberPlanUpdate(BaseModel):
    """更新增值計劃的模型"""
    name: Optional[str] = None
    description: Optional[str] = None
    base_amount: Optional[float] = None
    bonus_amount: Optional[float] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class MemberPlanInDBBase(MemberPlanBase):
    """資料庫中的增值計劃模型"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MemberPlan(MemberPlanInDBBase):
    """API返回的增值計劃模型"""
    pass


class MemberPlanList(BaseModel):
    """增值計劃列表模型"""
    items: List[MemberPlan]
    total: int 