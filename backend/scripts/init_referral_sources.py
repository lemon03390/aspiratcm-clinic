#!/usr/bin/env python3
"""
初始化系統的介紹人選項
"""
import sys
import os
import logging
from pathlib import Path

# 將專案根目錄添加到 Python 路徑
current_dir = Path(__file__).parent.absolute()
backend_dir = current_dir.parent
sys.path.insert(0, str(backend_dir))

from app.db.session import get_db
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.setting import TcmSetting
from app.schemas.setting import CategoryEnum

# 設定日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 預設介紹人選項
DEFAULT_REFERRAL_SOURCES = [
    {"name": "無", "aliases": None, "code": "RF0001"},
    {"name": "小寶", "aliases": None, "code": "RF0002"},
]

def init_referral_sources():
    """初始化介紹人選項"""
    db = next(get_db())
    try:
        if (
            existing_sources := db.query(TcmSetting)
            .filter(TcmSetting.category == CategoryEnum.REFERRAL_SOURCE)
            .all()
        ):
            logger.info(f"已有 {len(existing_sources)} 個介紹人選項，不進行初始化")
            return

        # 添加預設介紹人選項
        for source in DEFAULT_REFERRAL_SOURCES:
            setting = TcmSetting(
                category=CategoryEnum.REFERRAL_SOURCE,
                name=source["name"],
                code=source["code"],
                aliases=source["aliases"]
            )
            db.add(setting)

        db.commit()
        logger.info(f"成功初始化 {len(DEFAULT_REFERRAL_SOURCES)} 個介紹人選項")
    except Exception as e:
        db.rollback()
        logger.error(f"初始化介紹人選項失敗: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    logger.info("開始初始化介紹人選項...")
    init_referral_sources()
    logger.info("初始化介紹人選項完成") 