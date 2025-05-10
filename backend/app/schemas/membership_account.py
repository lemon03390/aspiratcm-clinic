from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


# --- MembershipAccountBalance Schemas ---
class MembershipAccountBalanceBase(BaseModel):
    membership_id: int
    storedValue: int
    giftedValue: int


class MembershipAccountBalanceCreate(MembershipAccountBalanceBase):
    pass


class MembershipAccountBalanceUpdate(BaseModel):
    storedValue: Optional[int] = None
    giftedValue: Optional[int] = None


class MembershipAccountBalanceInDBBase(MembershipAccountBalanceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MembershipAccountBalance(MembershipAccountBalanceInDBBase):
    pass


# --- MembershipAccountLog Schemas ---
class MembershipAccountLogBase(BaseModel):
    membership_id: int
    amount: int
    giftAmount: int = 0
    type: str  # 'Start', 'TopUp', 'TopUp1', 'TopUp2'..., 'Spend'
    description: Optional[str] = None


class MembershipAccountLogCreate(MembershipAccountLogBase):
    pass


class MembershipAccountLogUpdate(BaseModel):
    amount: Optional[int] = None
    giftAmount: Optional[int] = None
    type: Optional[str] = None
    description: Optional[str] = None


class MembershipAccountLogInDBBase(MembershipAccountLogBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MembershipAccountLog(MembershipAccountLogInDBBase):
    pass


class MembershipAccountLogList(BaseModel):
    logs: List[MembershipAccountLog]
    total: int


# --- 會員增值和消費操作 Schemas ---
class MembershipTopUp(BaseModel):
    """會員增值操作"""
    amount: int = 0  # 儲值金額，用於自定義增值
    gift_amount: int = 0  # 贈送金額，用於自定義增值
    plan_id: Optional[int] = None  # 增值計劃ID
    
    class Config:
        schema_extra = {
            "example": {
                "amount": 1000,
                "gift_amount": 100,
                "plan_id": None  # 如使用預設計劃則設置對應ID
            }
        }


class MembershipSpend(BaseModel):
    """會員消費操作"""
    amount: int  # 消費金額
    
    class Config:
        schema_extra = {
            "example": {
                "amount": 500
            }
        } 