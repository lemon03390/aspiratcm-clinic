from app.db.database import engine
from app.models.base import Base
from app.models import *  # 確保所有模型被導入

def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    print("正在創建數據庫表...")
    init_db()
    print("數據庫表創建完成！") 