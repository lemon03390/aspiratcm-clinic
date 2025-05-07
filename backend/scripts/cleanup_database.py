#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
清理資料庫腳本 - 只保留醫生和預約相關表
"""

import os
import sys
import logging
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

# 要保留的表
TABLES_TO_KEEP = [
    "doctors",
    "appointments",
    "alembic_version"  # 保留版本控制表
]

def get_all_tables(engine):
    """獲取資料庫中所有表名"""
    query = text("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    """)
    
    with engine.connect() as conn:
        result = conn.execute(query)
        return [row[0] for row in result]

def drop_tables(engine, tables_to_drop):
    """刪除指定的表"""
    if not tables_to_drop:
        logger.info("沒有需要刪除的表")
        return
    
    logger.info(f"準備刪除以下表: {', '.join(tables_to_drop)}")
    
    # 先刪除所有外鍵約束
    drop_constraints_sql = text("""
    DO $$ 
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN (
            SELECT conname, conrelid::regclass AS table_name
            FROM pg_constraint
            WHERE contype = 'f'
            AND conrelid::regclass::text = ANY(:tables)
        ) LOOP
            EXECUTE 'ALTER TABLE ' || r.table_name || ' DROP CONSTRAINT ' || r.conname;
        END LOOP;
    END $$;
    """)
    
    with engine.connect() as conn:
        conn.execute(drop_constraints_sql, {"tables": tables_to_drop})
        conn.commit()
        logger.info("已刪除所有外鍵約束")
    
    # 逐個刪除表
    with engine.connect() as conn:
        for table in tables_to_drop:
            try:
                conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
                logger.info(f"已刪除表: {table}")
            except Exception as e:
                logger.error(f"刪除表 {table} 時出錯: {str(e)}")
        
        conn.commit()
    
    logger.info("表刪除完成")

def main():
    """主函數"""
    logger.info("開始清理資料庫")
    
    try:
        # 連接資料庫
        engine = create_engine(CONNECTION_STRING)
        logger.info(f"成功連接到資料庫: {DB_HOST}:{DB_PORT}/{DB_NAME}")
        
        # 獲取所有表
        all_tables = get_all_tables(engine)
        logger.info(f"資料庫中共有 {len(all_tables)} 個表")
        
        # 確定要刪除的表
        tables_to_drop = [table for table in all_tables if table not in TABLES_TO_KEEP]
        logger.info(f"將保留表: {', '.join(TABLES_TO_KEEP)}")
        logger.info(f"將刪除表: {', '.join(tables_to_drop)}")
        
        # 確認操作
        confirm = input("這個操作將刪除上述表並清除所有相關數據。確定繼續嗎？(y/n): ")
        if confirm.lower() != 'y':
            logger.info("操作已取消")
            return
        
        # 執行刪除
        drop_tables(engine, tables_to_drop)
        
        logger.info("資料庫清理完成，只保留了醫生和預約相關表")
        
    except Exception as e:
        logger.error(f"清理資料庫時出錯: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 