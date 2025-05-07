from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import os
from dotenv import load_dotenv
import logging
from typing import Generator

# === 設定 Logging ===
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# === 載入環境變數 ===
load_dotenv()

# === 從 .env 取得資料庫設定 ===
DB_HOST = os.getenv("DB_HOST", "postgres-clinic")  # 使用 Docker 服務名稱為預設值
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_DATABASE", "clinic")  # 提供預設值以防環境變數未設定
DB_USER = os.getenv("DB_USERNAME", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

# === 組合連線字串 ===
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
logger.info(f"使用的資料庫連線：{DATABASE_URL}")

# === 建立 SQLAlchemy 引擎 ===
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# === FastAPI Dependency 用的 DB Session 函數 ===
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        logger.debug("數據庫會話已創建")
        yield db
    finally:
        db.close()
        logger.debug("數據庫會話已關閉")
