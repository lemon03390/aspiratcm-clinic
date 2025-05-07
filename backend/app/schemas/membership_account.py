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
        orm_mode = True


class MembershipAccountBalance(MembershipAccountBalanceInDBBase):
    pass


# --- MembershipAccountLog Schemas ---
class MembershipAccountLogBase(BaseModel):
    membership_id: int
    amount: int
    giftAmount: int = 0
    type: str  # 'deposit' 或 'consumption'
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
        orm_mode = True


class MembershipAccountLog(MembershipAccountLogInDBBase):
    pass


class MembershipAccountLogList(BaseModel):
    logs: List[MembershipAccountLog]
    total: int 