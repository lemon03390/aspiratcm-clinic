#!/usr/bin/env python3
"""
匯入會員資料的腳本

用法：
    python -m scripts.import_members /path/to/memberships.csv
"""

import csv
import datetime
import logging
import os
import sys
from typing import List

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

sys.path.append(".")

from app.core.config import settings
from app.models.member import Member

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 資料庫連線
engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def parse_date(date_str: str) -> datetime.datetime:
    """解析日期字符串"""
    if not date_str or date_str.lower() in {"null", "none", ""}:
        return None
    try:
        # 嘗試多種日期格式
        formats = ["%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y"]
        for fmt in formats:
            try:
                return datetime.datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        # 如果所有格式都失敗，嘗試解析時間戳
        return datetime.datetime.fromtimestamp(float(date_str))
    except Exception as e:
        logger.warning(f"無法解析日期 '{date_str}': {e}")
        return None


def parse_boolean(bool_str: str) -> bool:
    """解析布爾值字串"""
    if not bool_str or bool_str.lower() in {"null", "none", ""}:
        return False
    return bool_str.lower() in {"true", "yes", "1", "y", "t"}


def import_members(csv_path: str) -> List[Member]:
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
                # 檢查此會員是否已存在（使用 ID 或身分證號碼）
                id_number = row.get("id_number")
                if id_number:
                    if existing_member := (
                        db.query(Member)
                        .filter(Member.id_number == id_number)
                        .first()
                    ):
                        logger.info(f"跳過已存在會員: {id_number}")
                        skipped.append(id_number)
                        continue

                # 建立新會員
                member = Member(
                    name=row.get("name", ""),
                    phone=row.get("phone", ""),
                    id_number=id_number,
                    gender=row.get("gender", ""),
                    dob=parse_date(row.get("dob", "")),
                    has_card=parse_boolean(row.get("has_card", "")),
                    has_signed_consent_form=parse_boolean(row.get("has_signed_consent_form", "")),
                )
                db.add(member)
                imported.append(member)

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
    if len(sys.argv) != 2:
        logger.error("使用方法: python -m scripts.import_members /path/to/memberships.csv")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    import_members(csv_path) 