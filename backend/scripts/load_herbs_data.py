#!/usr/bin/env python
import os
import sys
import json
from pathlib import Path

# 添加項目根目錄到導入路徑
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import create_engine

from app.models import Herb, Inventory
from app.db.session import get_db

def load_herbs_data():
    """將中藥數據從 JSON 文件加載到資料庫"""
    # 獲取資料庫連接
    db = next(get_db())
    
    # 讀取 JSON 文件
    data_file = Path(__file__).parent.parent / "data" / "powder_ratio_price.json"
    with open(data_file, "r", encoding="utf-8") as f:
        herbs_data = json.load(f)
    
    print(f"從 {data_file} 找到 {len(herbs_data)} 條中藥記錄")
    
    # 計數器
    created = 0
    skipped = 0
    
    # 插入資料
    for herb_data in herbs_data:
        # 檢查是否已存在
        existing_herb = db.query(Herb).filter(Herb.code == herb_data["code"]).first()
        if existing_herb:
            print(f"藥品已存在，跳過: {herb_data['code']} - {herb_data['name']}")
            skipped += 1
            continue
        
        # 創建新記錄
        try:
            # 處理 aliases 字段 (確保是列表)
            if "aliases" in herb_data and not isinstance(herb_data["aliases"], list):
                herb_data["aliases"] = []
            
            # 創建藥品記錄
            new_herb = Herb(
                code=herb_data["code"],
                name=herb_data["name"],
                brand=herb_data.get("brand", ""),
                concentration_ratio=herb_data.get("concentration_ratio", 0),
                decoction_equivalent_per_g=herb_data.get("decoction_equivalent_per_g", 0),
                unit=herb_data.get("unit", "g"),
                quantity_per_bottle=herb_data.get("quantity_per_bottle", 0),
                price=herb_data.get("price", 0),
                currency=herb_data.get("currency", "HKD"),
                is_compound=herb_data.get("is_compound", False),
                aliases=herb_data.get("aliases", []),
            )
            
            # 處理複方藥的成分
            if herb_data.get("is_compound", False) and "ingredients" in herb_data:
                new_herb.ingredients = herb_data["ingredients"]
            
            db.add(new_herb)
            db.flush()  # 獲取 ID
            
            # 創建初始庫存記錄 (默認為0)
            initial_inventory = Inventory(
                herb_id=new_herb.id,
                quantity=0  # 初始庫存為 0 瓶
            )
            db.add(initial_inventory)
            
            created += 1
            print(f"添加藥品: {herb_data['code']} - {herb_data['name']}")
            
        except Exception as e:
            db.rollback()
            print(f"添加失敗 {herb_data['code']} - {herb_data['name']}: {str(e)}")
            continue
    
    # 提交事務
    try:
        db.commit()
        print(f"成功導入 {created} 條記錄，跳過 {skipped} 條記錄")
    except Exception as e:
        db.rollback()
        print(f"提交事務失敗: {str(e)}")

if __name__ == "__main__":
    load_herbs_data()
    print("數據導入完成！") 