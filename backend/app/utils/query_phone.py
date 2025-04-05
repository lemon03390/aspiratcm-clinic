"""
電話查詢工具
用於根據電話號碼查詢相關預約資訊
"""
from app.db.database import SessionLocal
from sqlalchemy import text

def query_by_phone(phone_number):
    db = SessionLocal()
    query = text("""
    SELECT a.id, a.patient_name, a.phone_number, d.name as doctor_name, 
           a.appointment_time, a.status
    FROM appointments a
    LEFT JOIN doctors d ON a.doctor_id = d.id
    WHERE a.phone_number = :phone
    """)
    
    appointments = db.execute(query, {"phone": phone_number}).fetchall()
    
    print(f"\n電話 {phone_number} 的預約記錄:")
    if not appointments:
        print("沒有找到預約記錄")
        return
    
    for a in appointments:
        print(f"ID: {a[0]}, 患者: {a[1]}, 醫師: {a[3]}, 時間: {a[4]}, 狀態: {a[5]}")

if __name__ == "__main__":
    query_by_phone("88888888")
    query_by_phone("99999999") 