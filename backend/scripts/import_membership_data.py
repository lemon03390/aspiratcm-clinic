#!/usr/bin/env python3
"""
會員資料導入腳本
將從舊系統導出的 CSV 文件導入到新系統的 PostgreSQL 資料庫
"""
import csv
import os
import logging
from datetime import datetime
from typing import Dict, List, Any

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

from app.core.settings import settings
from app.models.membership import Membership
from app.models.membership_account import MembershipAccountBalance, MembershipAccountLog

# 設置日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 建立資料庫連接
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# CSV 文件路徑
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FRONTEND_DATA_DIR = os.path.join(BASE_DIR, "frontend", "public", "data")
MEMBERSHIPS_CSV = "/app/frontend/public/data/memberships.csv"
BALANCES_CSV = "/app/frontend/public/data/membership_account_balances.csv"
LOGS_CSV = "/app/frontend/public/data/membership_account_logs.csv"


def read_csv(file_path: str) -> List[Dict[str, Any]]:
    """讀取 CSV 文件並返回字典列表"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            return list(reader)
    except Exception as e:
        logger.error(f"讀取 CSV 文件 {file_path} 時出錯: {e}")
        raise


def parse_datetime(dt_str: str) -> datetime:
    """解析日期時間字符串"""
    if not dt_str:
        return datetime.now()
    try:
        return datetime.strptime(dt_str, '%Y-%m-%d %H:%M:%S')
    except ValueError:
        logger.warning(f"無法解析日期時間: {dt_str}，使用當前時間")
        return datetime.now()


def import_memberships(session) -> Dict[int, int]:
    """導入會員資料，返回舊 ID 到新 ID 的映射"""
    logger.info("開始導入會員資料...")
    id_mapping = {}
    memberships_data = read_csv(MEMBERSHIPS_CSV)
    
    for idx, row in enumerate(memberships_data):
        try:
            # 創建會員記錄
            old_id = int(row['id'])
            membership = Membership(
                patient_id=int(row['patient_id']) if row['patient_id'] else None,
                phoneNumber=row['phoneNumber'],
                contactAddress=row['contactAddress'],
                patientName=row['patientName'],
                hkid=row['hkid'],
                termsConsent=bool(int(row['termsConsent'])),
                haveCard=bool(int(row['haveCard'])),
                created_at=parse_datetime(row['created_at']),
                updated_at=parse_datetime(row['updated_at'])
            )
            session.add(membership)
            session.flush()  # 獲取新生成的 ID
            
            id_mapping[old_id] = membership.id
            
            # 每 100 條記錄提交一次
            if (idx + 1) % 100 == 0:
                session.commit()
                logger.info(f"已導入 {idx + 1} 條會員記錄")
                
        except Exception as e:
            logger.error(f"導入會員記錄時出錯 (行 {idx + 2}): {e}")
            continue
    
    # 提交剩餘記錄
    session.commit()
    logger.info(f"會員資料導入完成，共導入 {len(id_mapping)} 條記錄")
    return id_mapping


def import_account_balances(session, id_mapping: Dict[int, int]):
    """導入會員餘額資料"""
    logger.info("開始導入會員餘額資料...")
    balances_data = read_csv(BALANCES_CSV)
    
    for idx, row in enumerate(balances_data):
        try:
            old_membership_id = int(row['membership_id'])
            if old_membership_id not in id_mapping:
                logger.warning(f"會員 ID {old_membership_id} 不在映射中，跳過")
                continue
                
            new_membership_id = id_mapping[old_membership_id]
            
            balance = MembershipAccountBalance(
                membership_id=new_membership_id,
                storedValue=int(float(row['storedValue'])),
                giftedValue=int(float(row['giftedValue'])),
                created_at=parse_datetime(row['created_at']),
                updated_at=parse_datetime(row['updated_at'])
            )
            session.add(balance)
            
            # 每 100 條記錄提交一次
            if (idx + 1) % 100 == 0:
                session.commit()
                logger.info(f"已導入 {idx + 1} 條餘額記錄")
                
        except Exception as e:
            logger.error(f"導入餘額記錄時出錯 (行 {idx + 2}): {e}")
            continue
    
    # 提交剩餘記錄
    session.commit()
    logger.info("會員餘額資料導入完成")


def import_account_logs(session, id_mapping: Dict[int, int]):
    """導入會員帳戶日誌資料"""
    logger.info("開始導入會員帳戶變動記錄...")
    logs_data = read_csv(LOGS_CSV)
    
    for idx, row in enumerate(logs_data):
        try:
            old_membership_id = int(row['membership_id'])
            if old_membership_id not in id_mapping:
                logger.warning(f"會員 ID {old_membership_id} 不在映射中，跳過")
                continue
                
            new_membership_id = id_mapping[old_membership_id]
            
            # 根據交易類型設置 amount 和 type
            amount = abs(int(float(row['amount'])))
            gift_amount = abs(int(float(row.get('giftAmount', 0) or 0)))
            log_type = 'deposit' if int(float(row['amount'])) > 0 else 'consumption'
            
            log = MembershipAccountLog(
                membership_id=new_membership_id,
                amount=amount,
                giftAmount=gift_amount,
                type=log_type,
                description=row.get('description', ''),
                created_at=parse_datetime(row['created_at']),
                updated_at=parse_datetime(row['updated_at'])
            )
            session.add(log)
            
            # 每 500 條記錄提交一次
            if (idx + 1) % 500 == 0:
                session.commit()
                logger.info(f"已導入 {idx + 1} 條日誌記錄")
                
        except Exception as e:
            logger.error(f"導入日誌記錄時出錯 (行 {idx + 2}): {e}")
            continue
    
    # 提交剩餘記錄
    session.commit()
    logger.info("會員帳戶變動記錄導入完成")


def main():
    """執行導入流程"""
    logger.info("開始導入會員資料流程...")
    
    # 檢查 CSV 文件是否存在
    for file_path in [MEMBERSHIPS_CSV, BALANCES_CSV, LOGS_CSV]:
        if not os.path.exists(file_path):
            logger.error(f"檔案不存在: {file_path}")
            return
    
    session = SessionLocal()
    try:
        # 導入會員資料並獲取 ID 映射
        id_mapping = import_memberships(session)
        
        # 導入會員餘額資料
        import_account_balances(session, id_mapping)
        
        # 導入會員帳戶日誌
        import_account_logs(session, id_mapping)
        
        logger.info("所有資料導入完成！")
        
    except Exception as e:
        logger.error(f"導入過程中發生錯誤: {e}")
        session.rollback()
    finally:
        session.close()


if __name__ == "__main__":
    main() 
