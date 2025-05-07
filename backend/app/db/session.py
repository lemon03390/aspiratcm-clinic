import os
import logging
from typing import Generator
from contextlib import contextmanager
from sqlalchemy.orm import Session
from app.db.database import engine, SessionLocal, get_db

# === 設定 Logging ===
logger = logging.getLogger(__name__)

# === 上下文管理器用的 DB Session ===
@contextmanager
def db_session() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 