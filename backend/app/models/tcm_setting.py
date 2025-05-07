from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class TcmSetting(Base):
    """中醫設定模型"""
    __tablename__ = "tcm_settings"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), nullable=False, index=True, comment="設定類別")
    code = Column(String(50), nullable=True, index=True, comment="代碼")
    name = Column(String(100), nullable=False, comment="名稱")
    aliases = Column(Text, nullable=True, comment="別名，以逗號分隔")
    parent_id = Column(Integer, ForeignKey("tcm_settings.id"), nullable=True)

    # 自參考關係
    children = relationship("TcmSetting", 
                           backref="parent",
                           remote_side=[id],
                           cascade="all, delete-orphan") 