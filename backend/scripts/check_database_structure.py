#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
檢查資料庫結構腳本 - 確保所需表格和欄位存在
"""

import os
import sys
import logging
from sqlalchemy import create_engine, text, inspect

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

# 期望的表結構
EXPECTED_STRUCTURE = {
    "doctors": [
        "id", "name", "email", "phone", "schedule", 
        "created_at", "updated_at"
    ],
    "appointments": [
        "id", "patient_name", "phone_number", "doctor_id", 
        "appointment_time", "status", "next_appointment", 
        "related_appointment_id", "consultation_type", 
        "is_first_time", "is_troublesome", "is_contagious",
        "referral_source", "referral_notes",
        "created_at", "updated_at"
    ]
}

def check_database_structure(engine):
    """檢查資料庫結構是否符合預期"""
    inspector = inspect(engine)
    
    # 檢查表是否存在
    existing_tables = inspector.get_table_names()
    logger.info(f"發現的表格: {', '.join(existing_tables) if existing_tables else '無表格'}")
    
    missing_tables = []
    for table in EXPECTED_STRUCTURE:
        if table not in existing_tables:
            missing_tables.append(table)
    
    if missing_tables:
        logger.error(f"缺失的表格: {', '.join(missing_tables)}")
        return False
    
    # 檢查每個表的欄位
    all_columns_exist = True
    for table, columns in EXPECTED_STRUCTURE.items():
        if table not in existing_tables:
            continue  # 跳過不存在的表
            
        existing_columns = [col["name"] for col in inspector.get_columns(table)]
        logger.info(f"{table} 表欄位: {', '.join(existing_columns)}")
        
        missing_columns = []
        for col in columns:
            if col not in existing_columns:
                missing_columns.append(col)
                all_columns_exist = False
        
        if missing_columns:
            logger.error(f"{table} 表缺失欄位: {', '.join(missing_columns)}")
    
    return all_columns_exist

def add_missing_columns(engine):
    """添加缺失的欄位"""
    inspector = inspect(engine)
    
    with engine.connect() as conn:
        conn.execute(text("BEGIN"))
        try:
            for table, expected_columns in EXPECTED_STRUCTURE.items():
                if table not in inspector.get_table_names():
                    logger.error(f"表格 {table} 不存在，無法添加欄位")
                    continue
                
                existing_columns = [col["name"] for col in inspector.get_columns(table)]
                
                for col in expected_columns:
                    if col not in existing_columns:
                        if col == "referral_source":
                            sql = f"ALTER TABLE {table} ADD COLUMN {col} VARCHAR"
                            conn.execute(text(sql))
                            logger.info(f"已添加 {table}.{col} (VARCHAR)")
                        elif col == "referral_notes":
                            sql = f"ALTER TABLE {table} ADD COLUMN {col} TEXT"
                            conn.execute(text(sql))
                            logger.info(f"已添加 {table}.{col} (TEXT)")
                        elif col in ["is_first_time", "is_troublesome", "is_contagious"]:
                            sql = f"ALTER TABLE {table} ADD COLUMN {col} INTEGER DEFAULT 0"
                            conn.execute(text(sql))
                            logger.info(f"已添加 {table}.{col} (INTEGER)")
                        elif col in ["created_at", "updated_at", "appointment_time", "next_appointment"]:
                            sql = f"ALTER TABLE {table} ADD COLUMN {col} TIMESTAMP"
                            conn.execute(text(sql))
                            logger.info(f"已添加 {table}.{col} (TIMESTAMP)")
                        elif col == "consultation_type":
                            sql = f"ALTER TABLE {table} ADD COLUMN {col} JSON"
                            conn.execute(text(sql))
                            logger.info(f"已添加 {table}.{col} (JSON)")
                        else:
                            sql = f"ALTER TABLE {table} ADD COLUMN {col} VARCHAR"
                            conn.execute(text(sql))
                            logger.info(f"已添加 {table}.{col} (VARCHAR)")
            
            conn.execute(text("COMMIT"))
            logger.info("已完成缺失欄位的添加")
        except Exception as e:
            conn.execute(text("ROLLBACK"))
            logger.error(f"添加欄位時出錯: {str(e)}")
            raise

def main():
    """主函數"""
    logger.info("開始檢查資料庫結構")
    
    try:
        # 連接資料庫
        engine = create_engine(CONNECTION_STRING)
        logger.info(f"成功連接到資料庫: {DB_HOST}:{DB_PORT}/{DB_NAME}")
        
        # 檢查結構
        structure_ok = check_database_structure(engine)
        
        if not structure_ok:
            logger.warning("發現結構問題，正在自動修復...")
            add_missing_columns(engine)
            # 再次檢查以確認修復成功
            structure_ok = check_database_structure(engine)
            if structure_ok:
                logger.info("結構問題已成功修復")
            else:
                logger.warning("部分問題未能自動修復，請檢查日誌")
        else:
            logger.info("資料庫結構正確，包含所有需要的表格和欄位")
        
    except Exception as e:
        logger.error(f"檢查資料庫結構時出錯: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 