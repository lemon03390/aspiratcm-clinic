from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
import json
from pathlib import Path

from app.db.session import get_db
from app.models import Herb, Inventory
from app.schemas.herbs import (
    HerbInDB, 
    HerbSearchResponse, 
    InventoryCheckRequest, 
    InventoryCheckResponse
)

router = APIRouter()


@router.get("", response_model=HerbSearchResponse)
def search_herbs(
    db: Session = Depends(get_db),
    search: Optional[str] = None,
    is_compound: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
):
    """
    搜尋中藥，支援模糊搜尋
    
    - **search**: 模糊搜尋關鍵字 (code、name、aliases、brand)
    - **is_compound**: 是否為複方藥，不傳則顯示全部
    - **skip**: 分頁開始
    - **limit**: 每頁數量
    """
    query = db.query(Herb)
    
    # 篩選複方/單方
    if is_compound is not None:
        query = query.filter(Herb.is_compound == is_compound)
    
    # 模糊搜尋
    if search:
        search = f"%{search}%"
        query = query.filter(
            or_(
                Herb.code.ilike(search),
                Herb.name.ilike(search),
                Herb.brand.ilike(search),
                # 搜尋 aliases 數組
                Herb.aliases.any(lambda x: x.ilike(search))
            )
        )
    
    # 計算總數
    total = query.count()
    
    # 分頁
    herbs = query.order_by(Herb.code).offset(skip).limit(limit).all()
    
    return {"items": herbs, "total": total}


@router.get("/powder-ratio-price", response_model=List[Dict[str, Any]])
def get_powder_ratio_price():
    """
    獲取中藥粉末與飲片換算資料 (powder_ratio_price.json)
    返回完整中藥數據列表
    """
    try:
        # 讀取 JSON 檔案
        data_file = Path(__file__).parent.parent.parent.parent.parent / "data" / "powder_ratio_price.json"
        with open(data_file, "r", encoding="utf-8") as f:
            herbs_data = json.load(f)
        
        return herbs_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"讀取中藥資料失敗: {str(e)}")


@router.post("/inventory/check", response_model=InventoryCheckResponse)
def check_inventory(
    request: InventoryCheckRequest,
    db: Session = Depends(get_db)
):
    """
    檢查中藥庫存是否足夠
    
    - **herb_code**: 藥品代碼
    - **required_powder_amount**: 需要的藥粉量 (克)
    """
    # 查找藥品
    herb = db.query(Herb).filter(Herb.code == request.herb_code).first()
    if not herb:
        raise HTTPException(status_code=404, detail=f"找不到藥品代碼: {request.herb_code}")
    
    # 查詢庫存
    inventory = db.query(Inventory).filter(Inventory.herb_id == herb.id).first()
    if not inventory:
        # 無庫存記錄，創建一個初始記錄
        inventory = Inventory(herb_id=herb.id, quantity=0)
        db.add(inventory)
        db.commit()
        db.refresh(inventory)
    
    # 計算需求量
    required_amount = request.required_powder_amount
    
    # 計算當前庫存總量 (克)
    available_amount = round(inventory.quantity * herb.quantity_per_bottle, 2)
    
    # 判斷是否足夠
    has_sufficient_stock = available_amount >= required_amount
    
    return {
        "herb_code": herb.code,
        "herb_name": herb.name,
        "has_sufficient_stock": has_sufficient_stock,
        "available_amount": available_amount,
        "required_amount": required_amount,
        "quantity_per_bottle": herb.quantity_per_bottle,
        "current_bottles": inventory.quantity
    } 