from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base


class TagType(Base):
    """標籤類型設定表"""
    __tablename__ = "tag_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True, unique=True, comment="標籤名稱")
    description = Column(String, nullable=True, comment="標籤描述")
    color = Column(String, nullable=False, default="blue", comment="標籤顏色")
    icon = Column(String, nullable=True, comment="標籤圖示")
    is_active = Column(Boolean, default=True, comment="是否啟用")
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())
    
    # 關聯預約
    appointments = relationship("AppointmentTag", back_populates="tag")

    class Config:
        orm_mode = True 