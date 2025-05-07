#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
資料庫恢復腳本
用於初始化基本數據或從備份中恢復數據
"""

import os
import sys
import logging
import datetime
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

def check_database_empty():
    """檢查數據庫是否為空（沒有任何數據）"""
    engine = create_engine(CONNECTION_STRING)
    
    try:
        with engine.connect() as conn:
            # 檢查醫師表
            result = conn.execute(text("SELECT COUNT(*) FROM doctors"))
            doctors_count = result.scalar()
            
            # 檢查預約表
            result = conn.execute(text("SELECT COUNT(*) FROM appointments"))
            appointments_count = result.scalar()
            
            return doctors_count == 0 and appointments_count == 0
    except Exception as e:
        logger.error(f"檢查數據庫時出錯: {e}")
        return False

def initialize_demo_data():
    """初始化演示數據，添加一些基本的醫師和預約數據"""
    engine = create_engine(CONNECTION_STRING)
    
    try:
        with engine.connect() as conn:
            conn.execute(text("BEGIN"))
            
            # 添加一些醫師數據
            doctors = [
                {"name": "王大明", "email": "wangdaming@example.com", "phone": "98765432"},
                {"name": "李小雲", "email": "lixiaoyun@example.com", "phone": "12345678"}
            ]
            
            doctor_ids = []
            for doctor in doctors:
                result = conn.execute(
                    text("INSERT INTO doctors (name, email, phone, created_at, updated_at) VALUES (:name, :email, :phone, NOW(), NOW()) RETURNING id"),
                    doctor
                )
                doctor_id = result.scalar()
                doctor_ids.append(doctor_id)
                logger.info(f"已添加醫師: {doctor['name']} (ID: {doctor_id})")
            
            # 添加一些預約數據
            tomorrow = datetime.datetime.now() + datetime.timedelta(days=1)
            day_after_tomorrow = datetime.datetime.now() + datetime.timedelta(days=2)
            
            appointments = [
                {"patient_name": "陳小明", "phone_number": "87654321", "doctor_id": doctor_ids[0], "appointment_time": tomorrow, "status": "confirmed"},
                {"patient_name": "林美麗", "phone_number": "23456789", "doctor_id": doctor_ids[1], "appointment_time": day_after_tomorrow, "status": "pending"}
            ]
            
            for appointment in appointments:
                result = conn.execute(
                    text("""
                        INSERT INTO appointments 
                        (patient_name, phone_number, doctor_id, appointment_time, status, created_at, updated_at) 
                        VALUES (:patient_name, :phone_number, :doctor_id, :appointment_time, :status, NOW(), NOW())
                        RETURNING id
                    """),
                    appointment
                )
                appointment_id = result.scalar()
                logger.info(f"已添加預約: {appointment['patient_name']} (ID: {appointment_id})")
            
            conn.execute(text("COMMIT"))
            logger.info("演示數據初始化完成")
    except Exception as e:
        logger.error(f"初始化演示數據時出錯: {e}")
        return False
    
    return True

def main():
    """主函數"""
    logger.info("開始檢查數據庫狀態")
    
    try:
        # 連接數據庫
        engine = create_engine(CONNECTION_STRING)
        logger.info(f"成功連接到數據庫: {DB_HOST}:{DB_PORT}/{DB_NAME}")
        
        # 檢查數據庫是否為空
        is_empty = check_database_empty()
        
        if is_empty:
            logger.warning("數據庫為空，即將初始化演示數據...")
            initialize_demo_data()
        else:
            logger.info("數據庫不為空，無需初始化")
            
    except Exception as e:
        logger.error(f"操作數據庫時出錯: {e}")
        sys.exit(1)
    
    logger.info("數據庫檢查/恢復完成")

if __name__ == "__main__":
    main() 