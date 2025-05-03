#!/usr/bin/env python3
"""
初始化TCM設定資料到數據庫
將Scripts目錄中的JSON文件導入到數據庫的tcm_settings表
"""
import os
import sys
import json
import asyncio
from pathlib import Path

# 將父級目錄添加到Python路徑
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.models.setting import TcmSetting
from app.db.session import get_db
from app.schemas.setting import CategoryEnum

# 文件映射
FILE_MAPPINGS = {
    'Scripts/modern_disease_list.json': CategoryEnum.MODERN_DISEASE,
    'Scripts/cm_syndrome_list.json': CategoryEnum.CM_SYNDROME,
    'Scripts/cm_principle_list.json': CategoryEnum.TCM_TREATMENT_RULE,
}

# 設定代碼前綴
PREFIX_MAP = {
    CategoryEnum.MODERN_DISEASE: "MD",
    CategoryEnum.CM_SYNDROME: "SYN",
    CategoryEnum.TCM_TREATMENT_RULE: "TR",
    CategoryEnum.TCM_TREATMENT_METHOD: "TM",
    CategoryEnum.TCM_SINGLE_HERB: "HERB"
}

async def import_json_file(file_path, category, db: Session):
    """導入指定的JSON文件到數據庫"""
    if not os.path.exists(file_path):
        print(f"文件不存在: {file_path}")
        return 0
    
    # 讀取JSON文件
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError:
        print(f"無法解析JSON文件: {file_path}")
        return 0
    
    # 檢查資料格式
    if not isinstance(data, list):
        print(f"JSON數據必須是列表格式: {file_path}")
        return 0
    
    # 計數器
    added_count = 0
    
    # 處理每一項
    for item in data:
        # 簡單字符串列表處理
        if isinstance(item, str):
            name = item.strip()
            if not name:
                continue
                
            # 檢查是否已存在
            existing = db.query(TcmSetting).filter(
                TcmSetting.category == category,
                TcmSetting.name == name
            ).first()
            
            if not existing:
                # 創建新記錄
                db_setting = TcmSetting(
                    category=category,
                    name=name,
                    aliases=None,
                    parent_id=None
                )
                db.add(db_setting)
                added_count += 1
        
        # 複雜對象處理
        elif isinstance(item, dict):
            name = item.get('name')
            aliases = item.get('aliases')
            
            if not name:
                continue
                
            # 格式化別名
            if aliases and isinstance(aliases, list):
                aliases = ','.join([a.strip() for a in aliases if a.strip()])
                
            # 檢查是否已存在
            existing = db.query(TcmSetting).filter(
                TcmSetting.category == category,
                TcmSetting.name == name
            ).first()
            
            if not existing:
                # 創建新記錄
                db_setting = TcmSetting(
                    category=category,
                    name=name,
                    aliases=aliases,
                    parent_id=None
                )
                db.add(db_setting)
                added_count += 1
                
    # 提交資料庫變更
    db.commit()
    
    # 更新所有沒有代碼的記錄
    prefix = PREFIX_MAP.get(category, "TC")
    settings_without_code = db.query(TcmSetting).filter(
        TcmSetting.category == category,
        TcmSetting.code.is_(None)
    ).all()
    
    for setting in settings_without_code:
        setting.code = f"{prefix}{setting.id:04d}"
    
    db.commit()
    
    return added_count

async def main():
    """主函數: 導入所有映射的文件"""
    # 獲取資料庫連接
    db = next(get_db())
    
    # 總計數器
    total_added = 0
    
    # 導入每個文件
    for file_path, category in FILE_MAPPINGS.items():
        print(f"正在導入 {category} 從 {file_path}")
        count = await import_json_file(file_path, category, db)
        total_added += count
        print(f"已導入 {count} 筆資料")
    
    print(f"已完成所有導入，總計: {total_added} 筆資料")

if __name__ == "__main__":
    asyncio.run(main()) 