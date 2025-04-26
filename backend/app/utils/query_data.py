"""
數據查詢工具
用於從數據庫中查詢和輸出各種資料
"""
from app.db.session import SessionLocal
from sqlalchemy import text

def execute_and_print_query(db, query, title):
    print(title)
    result = db.execute(text(query)).fetchall()
    for row in result:
        print(row[0])

def main():
    db = SessionLocal()
    
    # 查詢電話號碼
    execute_and_print_query(db, "SELECT DISTINCT phone_number FROM appointments", "電話號碼列表:")
    
    # 查詢患者名字
    print()  # 空行
    execute_and_print_query(db, "SELECT DISTINCT patient_name FROM appointments", "患者名字列表:")

if __name__ == "__main__":
    main() 