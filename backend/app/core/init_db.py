"""
資料庫初始化模組
用於創建所有定義的數據表
"""
from app.db.database import engine
from app.models.base import Base

def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    print("正在創建數據庫表...")
    init_db()
    print("數據庫表創建完成!") 