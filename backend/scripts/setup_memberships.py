#!/usr/bin/env python3
"""
設置會員表並導入資料的腳本

用法：
    python -m scripts.setup_memberships
"""

import logging
import os
import sys
import alembic.config

sys.path.append(".")

from sqlalchemy import inspect
from app.db.database import engine
from scripts.import_memberships import import_memberships

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migrations():
    """運行資料庫遷移"""
    logger.info("開始運行資料庫遷移...")
    try:
        alembicArgs = [
            "--raiseerr",
            "upgrade", "head",
        ]
        alembic.config.main(argv=alembicArgs)
        logger.info("遷移成功完成")
        return True
    except Exception as e:
        logger.error(f"遷移時發生錯誤: {e}")
        return False

def check_table_exists(table_name="memberships"):
    """檢查表是否存在"""
    try:
        inspector = inspect(engine)
        exists = inspector.has_table(table_name)
        return exists
    except Exception as e:
        logger.error(f"檢查表時發生錯誤: {e}")
        return False

def main():
    """主函數"""
    # 運行遷移
    if not run_migrations():
        logger.error("由於遷移失敗而退出")
        return

    # 檢查表是否已創建
    if not check_table_exists("memberships"):
        logger.error("完成遷移後仍找不到memberships表")
        return

    # 導入數據
    # 檢查不同可能的位置
    possible_paths = [
        "TablesOld/memberships.csv",
        "../TablesOld/memberships.csv",
        "/app/TablesOld/memberships.csv"
    ]
    
    csv_path = None
    for path in possible_paths:
        if os.path.exists(path):
            csv_path = path
            break
    
    if not csv_path:
        logger.error(f"CSV檔案不存在，已檢查以下路徑: {', '.join(possible_paths)}")
        return
        
    logger.info(f"開始導入會員資料: {csv_path}")
    imported_members = import_memberships(csv_path)
    logger.info(f"成功導入 {len(imported_members)} 筆會員資料")
    
    logger.info("完成所有設置")

if __name__ == "__main__":
    main() 