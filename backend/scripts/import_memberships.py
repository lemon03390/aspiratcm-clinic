#!/usr/bin/env python3
"""
匯入會員資料的腳本

用法：
    python -m scripts.import_memberships TablesOld/memberships.csv
"""

import csv
import datetime
import logging
import os
import sys
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

# 資料庫連線
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def parse_boolean(value: str) -> bool:
    """將字符串轉換為布爾值"""
    if not value or value.lower() in {"null", "none", ""}:
        return False
    return value.lower() in {"1", "true", "yes", "是", "t", "y"}


def import_memberships(csv_path: str) -> List[Membership]:
    """從 CSV 檔案匯入會員資料"""
    if not os.path.exists(csv_path):
        logger.error(f"檔案不存在: {csv_path}")
        sys.exit(1)

    imported = []
    skipped = []
    db = SessionLocal()

    try:
        with open(csv_path, "r", encoding="utf-8-sig") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # 檢查此會員是否已存在（使用身分證號碼）
                hkid = row.get("hkid")
                if hkid:
                    if existing_member := (
                        db.query(Membership)
                        .filter(Membership.hkid == hkid)
                        .first()
                    ):
                        logger.info(f"跳過已存在會員: {hkid}")
                        skipped.append(hkid)
                        continue

                # 解析patient_id
                patient_id = None
                if row.get("patient_id"):
                    try:
                        patient_id = int(row.get("patient_id"))
                    except ValueError:
                        logger.warning(f"無法解析patient_id '{row.get('patient_id')}'")

                # 建立新會員
                membership = Membership(
                    patient_id=patient_id,
                    phoneNumber=row.get("phoneNumber", ""),
                    contactAddress=row.get("contactAddress", ""),
                    patientName=row.get("patientName", ""),
                    hkid=hkid,
                    termsConsent=parse_boolean(row.get("termsConsent", "")),
                    haveCard=parse_boolean(row.get("haveCard", "")),
                )
                db.add(membership)
                imported.append(membership)

        db.commit()
        logger.info(f"成功匯入 {len(imported)} 筆會員資料")
        logger.info(f"跳過 {len(skipped)} 筆重複會員資料")
        return imported

    except Exception as e:
        logger.error(f"匯入錯誤: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"用法: python -m {os.path.basename(__file__)} <csv_file_path>")
        sys.exit(1)

    csv_file = sys.argv[1]
    import_memberships(csv_file) 