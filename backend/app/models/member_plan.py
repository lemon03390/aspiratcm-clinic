from sqlalchemy import Boolean, Column, DateTime, Integer, String, Float, func
from sqlalchemy.sql import text

from app.db.base_class import Base


class MemberPlan(Base):
    """增值計劃模型，定義會員增值方案的類型和規則。"""
    __tablename__ = "member_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)  # 計劃名稱
    description = Column(String, nullable=True)  # 計劃描述
    base_amount = Column(Float, nullable=False)  # 基礎金額
    bonus_amount = Column(Float, nullable=False, default=0.0)  # 贈送金額
    is_active = Column(Boolean, default=True)  # 是否啟用
    sort_order = Column(Integer, default=0)  # 排序順序
    created_at = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"), onupdate=func.now()) 