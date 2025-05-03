from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.ext.declarative import DeclarativeMeta
from sqlalchemy.orm import Session
from sqlalchemy.pool import QueuePool
from dotenv import load_dotenv
import os
import logging
from typing import Generator
from contextlib import contextmanager

# 設置日誌
logger = logging.getLogger(__name__)

# 載入環境變數
load_dotenv()

# 從環境變數獲取數據庫配置
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_DATABASE")
DB_USER = os.getenv("DB_USERNAME", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

# 構建數據庫連接 URL
SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# 創建數據庫引擎
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,  # 30分鐘
    pool_pre_ping=True,  # 連接池預先ping
)

# 創建會話工廠
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 創建Base類
Base: DeclarativeMeta = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """
    提供數據庫會話的依賴項函數
    
    使用yield使FastAPI能夠自動關閉會話（在響應返回後）
    """
    db = SessionLocal()
    try:
        logger.debug("數據庫會話已創建")
        yield db
    finally:
        db.close()
        logger.debug("數據庫會話已關閉")

@contextmanager
def db_session() -> Generator[Session, None, None]:
    """
    數據庫會話的上下文管理器
    
    用於手動管理數據庫會話的生命週期
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"數據庫操作失敗: {e}")
        raise
    finally:
        db.close() 