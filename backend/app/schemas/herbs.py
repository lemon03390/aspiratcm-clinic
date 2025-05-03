from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, UUID4, Field, root_validator
from datetime import datetime

# 基本資料模型
class HerbBase(BaseModel):
    code: str
    name: str
    brand: Optional[str] = None
    concentration_ratio: Optional[float] = 0.0
    decoction_equivalent_per_g: Optional[float] = 0.0
    unit: Optional[str] = "g"
    quantity_per_bottle: Optional[float] = 0.0
    price: Optional[float] = 0.0
    currency: Optional[str] = "HKD"
    is_compound: bool = False
    aliases: List[str] = []

# 創建時的模型 (接收請求)
class HerbCreate(HerbBase):
    ingredients: Optional[List[Dict[str, Any]]] = None

# 更新時的模型
class HerbUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    brand: Optional[str] = None
    concentration_ratio: Optional[float] = None
    decoction_equivalent_per_g: Optional[float] = None
    unit: Optional[str] = None
    quantity_per_bottle: Optional[float] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    is_compound: Optional[bool] = None
    aliases: Optional[List[str]] = None
    ingredients: Optional[List[Dict[str, Any]]] = None

# 回應的模型
class HerbInDB(HerbBase):
    id: UUID4
    ingredients: Optional[List[Dict[str, Any]]] = None

    class Config:
        orm_mode = True

# 列表查詢回應
class HerbSearchResponse(BaseModel):
    items: List[HerbInDB]
    total: int

# 庫存檢查請求
class InventoryCheckRequest(BaseModel):
    herb_code: str
    required_powder_amount: float

# 庫存檢查回應
class InventoryCheckResponse(BaseModel):
    herb_code: str
    herb_name: str
    has_sufficient_stock: bool
    available_amount: float  # 以克為單位的可用量
    required_amount: float   # 以克為單位的要求量
    quantity_per_bottle: float  # 每瓶克數
    current_bottles: float  # 目前瓶數 