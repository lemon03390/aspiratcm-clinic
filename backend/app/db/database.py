import os
import logging
from typing import Generator
from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from dotenv import load_dotenv
from app.models.base import Base

# === 設定 Logging ===
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# === 載入環境變數 ===
load_dotenv()

# === 從 .env 取得資料庫設定 ===
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_DATABASE")  # 移除預設值，強制從環境變數讀取
DB_USER = os.getenv("DB_USERNAME", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

# === 組合連線字串 ===
SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
logger.info(f"使用的資料庫連線：{SQLALCHEMY_DATABASE_URL}")

# === 建立 SQLAlchemy 引擎 ===
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    poolclass=QueuePool,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True,
)

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
