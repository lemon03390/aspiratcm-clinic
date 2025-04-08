# backend/run_migration.py
from app.db.database import engine
from app.models import *  # 這一行不能少，必須觸發所有 model 加入 Base
from app.models.base import Base

from sqlalchemy import inspect

def init_db():
    print("📦 正在建立資料表...")
    Base.metadata.create_all(bind=engine)

    # 驗證是否有成功建立
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    if not tables:
        print("❌ 沒有成功建立任何資料表！")
    else:
        print(f"✅ 已建立資料表：{tables}")

if __name__ == "__main__":
    init_db()

