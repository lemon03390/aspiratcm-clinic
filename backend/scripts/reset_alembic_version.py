#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
重置 alembic_version 腳本 - 使其與清理後的資料庫結構一致
"""

import os
import sys
import logging
import argparse
from sqlalchemy import create_engine, text

# 設置日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 資料庫連接設定
DB_USER = os.environ.get("POSTGRES_USER", "postgres")
DB_PASSWORD = os.environ.get("POSTGRES_PASSWORD", "postgres")
DB_HOST = os.environ.get("POSTGRES_HOST", "localhost")
DB_PORT = os.environ.get("POSTGRES_PORT", "5432")
DB_NAME = os.environ.get("POSTGRES_DB", "clinic")

# 構建連接字串
CONNECTION_STRING = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def get_current_version(engine):
    """獲取當前 alembic_version 中的版本號"""
    query = text("SELECT version_num FROM alembic_version")
    
    with engine.connect() as conn:
        result = conn.execute(query)
        versions = [row[0] for row in result]
        
        if not versions:
            logger.error("alembic_version 表為空，無法獲取當前版本")
            return None
        
        if len(versions) > 1:
            logger.warning(f"發現多個版本號: {', '.join(versions)}，將使用第一個")
        
        return versions[0]

def update_alembic_version(engine, new_version):
    """更新 alembic_version 表的版本號"""
    delete_sql = text("DELETE FROM alembic_version")
    insert_sql = text("INSERT INTO alembic_version (version_num) VALUES (:version)")
    
    with engine.connect() as conn:
        conn.execute(delete_sql)
        conn.execute(insert_sql, {"version": new_version})
        conn.commit()
        logger.info(f"已將 alembic_version 更新為: {new_version}")

def main():
    """主函數"""
    parser = argparse.ArgumentParser(description='重置 alembic_version 表的版本號')
    parser.add_argument('--version', help='要設置的 alembic 版本號 (留空則顯示當前版本)')
    
    args = parser.parse_args()
    
    try:
        # 連接資料庫
        engine = create_engine(CONNECTION_STRING)
        logger.info(f"成功連接到資料庫: {DB_HOST}:{DB_PORT}/{DB_NAME}")
        
        # 獲取當前版本
        current_version = get_current_version(engine)
        
        if current_version:
            logger.info(f"當前 alembic 版本號: {current_version}")
        
        # 如果指定了新版本，則更新
        if args.version:
            update_alembic_version(engine, args.version)
        elif not current_version:
            logger.error("未找到當前版本且未指定新版本，操作取消")
            sys.exit(1)
        else:
            logger.info("未指定新版本，僅顯示當前版本")
        
    except Exception as e:
        logger.error(f"操作 alembic_version 時出錯: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 