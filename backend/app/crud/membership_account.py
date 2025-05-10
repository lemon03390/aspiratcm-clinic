from typing import Any, Dict, List, Optional, Union
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.crud.base import CRUDBase
from app.models.membership_account import MembershipAccountBalance, MembershipAccountLog
from app.schemas.membership_account import (
    MembershipAccountBalanceCreate,
    MembershipAccountBalanceUpdate,
    MembershipAccountLogCreate,
    MembershipAccountLogUpdate
)


class CRUDMembershipAccountBalance(CRUDBase[MembershipAccountBalance, MembershipAccountBalanceCreate, MembershipAccountBalanceUpdate]):
    def get_by_membership_id(self, db: Session, *, membership_id: int) -> Optional[MembershipAccountBalance]:
        """通過會員ID獲取餘額資訊"""
        return db.query(MembershipAccountBalance).filter(MembershipAccountBalance.membership_id == membership_id).first()
    
    def create_or_update(self, db: Session, *, membership_id: int, stored_value: int = 0, gifted_value: int = 0) -> MembershipAccountBalance:
        """創建或更新會員餘額"""
        if balance := self.get_by_membership_id(db, membership_id=membership_id):
            balance.storedValue = stored_value
            balance.giftedValue = gifted_value
            return self._extracted_from_add_value_6(db, balance)
        else:
            obj_in = MembershipAccountBalanceCreate(
                membership_id=membership_id,
                storedValue=stored_value,
                giftedValue=gifted_value
            )
            return self.create(db, obj_in=obj_in)
    
    def add_value(self, db: Session, *, membership_id: int, stored_value: int = 0, gifted_value: int = 0) -> MembershipAccountBalance:
        """增加會員餘額（增值）"""
        if balance := self.get_by_membership_id(db, membership_id=membership_id):
            balance.storedValue += stored_value
            balance.giftedValue += gifted_value
            return self._extracted_from_add_value_6(db, balance)
        else:
            # 如果餘額記錄不存在，則創建新記錄
            obj_in = MembershipAccountBalanceCreate(
                membership_id=membership_id,
                storedValue=stored_value,
                giftedValue=gifted_value
            )
            return self.create(db, obj_in=obj_in)

    # TODO Rename this here and in `create_or_update` and `add_value`
    def _extracted_from_add_value_6(self, db, balance):
        db.commit()
        db.refresh(balance)
        return balance
    
    def deduct_value(self, db: Session, *, membership_id: int, total_amount: int) -> Dict[str, Any]:
        """扣減會員餘額（消費）
        根據消費額計算應扣減的儲值和贈送金額，返回扣減後的餘額及扣減明細
        """
        balance = self.get_by_membership_id(db, membership_id=membership_id)
        if not balance:
            raise ValueError(f"會員ID {membership_id} 的餘額記錄不存在")
        
        # 計算當前總餘額
        total_balance = balance.storedValue + balance.giftedValue
        if total_balance < total_amount:
            raise ValueError(f"餘額不足，當前總餘額: {total_balance}，需要扣減: {total_amount}")
        
        # 按比例扣減儲值金額和贈送金額
        # 計算需要從儲值金額中扣除的部分
        if total_balance > 0:
            stored_ratio = balance.storedValue / total_balance
            deduct_stored = int(round(total_amount * stored_ratio))
        else:
            deduct_stored = 0
        
        # 確保不會扣減超過實際餘額
        deduct_stored = min(deduct_stored, balance.storedValue)
        
        # 剩餘的從贈送金額中扣減
        deduct_gifted = total_amount - deduct_stored
        
        # 更新餘額
        balance.storedValue -= deduct_stored
        balance.giftedValue -= deduct_gifted
        db.commit()
        db.refresh(balance)
        
        return {
            "balance": balance,
            "deduct_detail": {
                "deduct_stored": deduct_stored,
                "deduct_gifted": deduct_gifted,
                "total_deducted": total_amount
            }
        }


class CRUDMembershipAccountLog(CRUDBase[MembershipAccountLog, MembershipAccountLogCreate, MembershipAccountLogUpdate]):
    def create_log(self, db: Session, *, membership_id: int, amount: int, gift_amount: int, type_: str, description: str = None) -> MembershipAccountLog:
        """創建交易記錄"""
        obj_in = MembershipAccountLogCreate(
            membership_id=membership_id,
            amount=amount,
            giftAmount=gift_amount,
            type=type_,
            description=description or str(amount + gift_amount)  # 如未提供描述，則使用總金額
        )
        return self.create(db, obj_in=obj_in)
    
    def get_logs_by_membership_id(
        self, db: Session, *, membership_id: int, skip: int = 0, limit: int = 100
    ) -> Dict[str, Any]:
        """獲取會員所有交易記錄"""
        query = db.query(MembershipAccountLog).filter(MembershipAccountLog.membership_id == membership_id)
        total = query.count()
        logs = query.order_by(desc(MembershipAccountLog.created_at)).offset(skip).limit(limit).all()
        
        return {
            "logs": logs,
            "total": total
        }


membership_account_balance = CRUDMembershipAccountBalance(MembershipAccountBalance)
membership_account_log = CRUDMembershipAccountLog(MembershipAccountLog) 