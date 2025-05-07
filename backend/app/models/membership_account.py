from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, func, Text
from sqlalchemy.sql import text
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class MembershipAccountBalance(Base):
    """會員餘額資料模型"""
    __tablename__ = "membership_account_balances"

    id = Column(Integer, primary_key=True, index=True)
    membership_id = Column(Integer, ForeignKey("memberships.id", ondelete="CASCADE"), nullable=False, index=True, unique=True)
    storedValue = Column(Integer, nullable=False, default=0)  # 儲值金額
    giftedValue = Column(Integer, nullable=False, default=0)  # 贈送金額
    created_at = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"), onupdate=func.now())

    # 關聯
    membership = relationship("Membership", backref="account_balance")


class MembershipAccountLog(Base):
    """會員餘額變動記錄模型"""
    __tablename__ = "membership_account_logs"

    id = Column(Integer, primary_key=True, index=True)
    membership_id = Column(Integer, ForeignKey("memberships.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)  # 交易金額 
    giftAmount = Column(Integer, nullable=False, default=0)  # 贈送金額
    type = Column(String, nullable=False)  # 'deposit' 或 'consumption'
    description = Column(String, nullable=True)  # 交易描述
    created_at = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"), index=True)
    updated_at = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"), onupdate=func.now())

    # 關聯
    membership = relationship("Membership", backref="account_logs") 