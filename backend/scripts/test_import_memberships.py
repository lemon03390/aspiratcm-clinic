#!/usr/bin/env python3
"""
測試從CSV導入會員資料的腳本

用法：
    python -m scripts.test_import_memberships
"""

import logging
import os
import sys

sys.path.append(".")

from scripts.import_memberships import import_memberships

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
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
    
    if not os.path.exists(csv_path):
        logger.error(f"CSV檔案不存在: {csv_path}")
        sys.exit(1)
        
    logger.info(f"開始導入會員資料: {csv_path}")
    imported_members = import_memberships(csv_path)
    logger.info(f"成功導入 {len(imported_members)} 筆會員資料") 