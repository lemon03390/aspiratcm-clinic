import os
import logging
from typing import Generator
from contextlib import contextmanager
from sqlalchemy.orm import sessionmaker, Session
from app.db.database import engine

# === 設定 Logging ===
logger = logging.getLogger(__name__)

# === 建立 Session 工廠 ===
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# === FastAPI Dependency 用的 DB Session ===
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        logger.debug("數據庫會話已創建")
        yield db
    finally:
        db.close()
        logger.debug("數據庫會話已關閉")

# === 上下文管理器用的 DB Session ===
@contextmanager
def db_session() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 