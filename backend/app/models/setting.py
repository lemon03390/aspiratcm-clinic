from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, func, Text
from sqlalchemy.sql import text
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class MemberTopUpPlan(Base):
    """會員增值計劃設置模型"""
    __tablename__ = "member_topup_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # 計劃名稱，如 "增值3000送350"
    stored_value = Column(Integer, nullable=False)  # 儲值金額
    gifted_value = Column(Integer, nullable=False)  # 贈送金額
    is_active = Column(Boolean, default=True)  # 是否啟用
    display_order = Column(Integer, default=0)  # 顯示順序
    created_at = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"), onupdate=func.now())

from sqlalchemy import Column, String, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.db.database import Base


class TcmSetting(Base):
    """中醫靜態參考資料設定表"""
    __tablename__ = "tcm_settings"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), nullable=False, index=True, comment="設定類別")
    code = Column(String(50), nullable=True, index=True, comment="代碼")
    name = Column(String(100), nullable=False, comment="名稱")
    aliases = Column(Text, nullable=True, comment="別名，以逗號分隔")
    parent_id = Column(Integer, ForeignKey("tcm_settings.id"), nullable=True)
    
    # 自參照關係
    parent = relationship("TcmSetting", remote_side=[id], backref="children")

    class Config:
        orm_mode = True 