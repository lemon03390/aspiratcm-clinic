from sqlalchemy import Column, String, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.models.base import Base


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