from app.db.database import engine
from app.db.database import Base
from app.models import doctor, appointment, patient  # 明確導入模型模組以觸發 SQLAlchemy 註冊

def init_db():
    # 確保所有模型都正確被註冊
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    print("正在創建數據庫表...")
    init_db()
    print("數據庫表創建完成！")
