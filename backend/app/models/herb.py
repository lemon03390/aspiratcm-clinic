from sqlalchemy import Column, String, Float, Boolean, Integer, DateTime, ForeignKey, JSON, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

from app.db.database import Base

class Herb(Base):
    """中藥資料模型，包含單味藥與複方藥"""
    __tablename__ = "herbs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, index=True, unique=True, nullable=False)
    name = Column(String, nullable=False)
    brand = Column(String)
    concentration_ratio = Column(Float)
    decoction_equivalent_per_g = Column(Float)
    unit = Column(String)
    quantity_per_bottle = Column(Float)
    price = Column(Float)
    currency = Column(String)
    is_compound = Column(Boolean, default=False)
    aliases = Column(ARRAY(String), default=[])
    ingredients = Column(JSON, nullable=True)
    
    # 庫存關聯
    inventory_records = relationship("Inventory", back_populates="herb")

    def __repr__(self):
        return f"<Herb {self.code}: {self.name}>"


class Inventory(Base):
    """中藥庫存資料模型"""
    __tablename__ = "inventory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    herb_id = Column(UUID(as_uuid=True), ForeignKey("herbs.id"), nullable=False)
    quantity = Column(Float, default=0)  # 庫存量，單位：瓶
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # 關聯
    herb = relationship("Herb", back_populates="inventory_records")

    def __repr__(self):
        return f"<Inventory {self.id}: {self.quantity} bottles>" 