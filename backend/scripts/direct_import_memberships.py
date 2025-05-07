#!/usr/bin/env python3
"""
直接將TablesOld/memberships.csv檔案導入到資料庫

用法：
    python -m scripts.direct_import_memberships [--csv CSV_PATH]
"""

import argparse
import csv
import logging
import os
import sys
from datetime import datetime
from typing import List, Dict, Any

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

sys.path.append(".")

from app.core.settings import settings
from app.models.membership import Membership

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEFAULT_CSV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'TablesOld', 'memberships.csv'))

def parse_boolean(value: str) -> bool:
    """將字符串轉換為布爾值"""
    if not value or value.lower() in {"null", "none", ""}:
        return False
    return value.lower() in {"1", "true", "yes", "是", "t", "y"}

def import_csv(csv_path: str):
    """從CSV導入資料"""
    if not os.path.exists(csv_path):
        logger.error(f"CSV檔案不存在: {csv_path}")
        sys.exit(1)
        
    # 資料庫連線
    try:
        # 使用環境變數中的資料庫URL
        logger.info(f"嘗試連接資料庫: {settings.DATABASE_URL}")
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
    except Exception as e:
        logger.error(f"資料庫連接失敗: {e}")
        sys.exit(1)
    
    # 導入資料
    try:
        with open(csv_path, "r", encoding="utf-8-sig") as csvfile:
            reader = csv.DictReader(csvfile)
            imported = []
            skipped = []
            errors = []
            row_count = 0
            
            for row in reader:
                row_count += 1
                try:
                    # 檢查必要欄位
                    if not row.get("patientName"):
                        errors.append(f"第 {row_count} 行: 缺少patientName欄位")
                        continue
                    
                    # 檢查此會員是否已存在（使用身分證號碼）
                    hkid = row.get("hkid")
                    if hkid:
                        existing = db.query(Membership).filter(Membership.hkid == hkid).first()
                        if existing:
                            logger.info(f"跳過已存在會員: {hkid}")
                            skipped.append(hkid)
                            continue
                    
                    # 解析patient_id
                    patient_id = None
                    if row.get("patient_id"):
                        try:
                            patient_id = int(row.get("patient_id"))
                        except ValueError:
                            errors.append(f"第 {row_count} 行: 無法解析patient_id")
                            continue
                    
                    # 建立新會員
                    membership = Membership(
                        patient_id=patient_id,
                        phoneNumber=row.get("phoneNumber"),
                        contactAddress=row.get("contactAddress"),
                        patientName=row.get("patientName"),
                        hkid=hkid,
                        termsConsent=parse_boolean(row.get("termsConsent")),
                        haveCard=parse_boolean(row.get("haveCard")),
                    )
                    db.add(membership)
                    imported.append(membership)
                    
                except Exception as e:
                    errors.append(f"第 {row_count} 行處理錯誤: {str(e)}")
            
            db.commit()
            logger.info(f"成功導入 {len(imported)} 筆資料")
            logger.info(f"跳過 {len(skipped)} 筆重複資料")
            if errors:
                logger.warning(f"有 {len(errors)} 筆資料導入失敗")
                for error in errors[:10]:  # 只顯示前10個錯誤
                    logger.warning(error)
            
    except Exception as e:
        logger.error(f"CSV處理失敗: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

def main():
    """主程序"""
    parser = argparse.ArgumentParser(description='導入會員CSV檔案到資料庫')
    parser.add_argument('--csv', type=str, default=DEFAULT_CSV_PATH, help='CSV檔案路徑')
    args = parser.parse_args()
    
    csv_path = args.csv
    logger.info(f"使用CSV檔案: {csv_path}")
    
    import_csv(csv_path)
        
if __name__ == "__main__":
    main() 