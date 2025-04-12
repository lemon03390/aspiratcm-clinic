from sqlalchemy.orm import Session
from app.models import WaitingList, Patient
from app.utils.logger import get_logger

logger = get_logger(__name__)

def add_to_waiting_list(
    db: Session, 
    patient_id: int, 
    registration_number: str, 
    chinese_name: str, 
    doctor_id: int = None
) -> WaitingList:
    """
    將患者添加到候診清單
    
    參數:
        db: 資料庫會話
        patient_id: 患者ID
        registration_number: 掛號編號
        chinese_name: 患者中文姓名
        doctor_id: 醫師ID (可選)
        
    返回:
        創建的等候清單記錄
    """
    try:
        # 檢查患者是否已在候診清單中
        existing = db.query(WaitingList).filter(WaitingList.patient_id == patient_id).first()
        if existing:
            # 如果已存在，返回現有記錄
            logger.info(f"患者 {patient_id} 已在候診清單中，跳過添加")
            return existing
            
        # 創建新的候診記錄
        waiting_entry = WaitingList(
            patient_id=patient_id,
            registration_number=registration_number,
            chinese_name=chinese_name,
            doctor_id=doctor_id
        )
        
        db.add(waiting_entry)
        db.commit()
        db.refresh(waiting_entry)
        
        logger.info(f"成功將患者 {patient_id} 添加到候診清單")
        return waiting_entry
        
    except Exception as e:
        db.rollback()
        logger.error(f"將患者添加到候診清單時出錯: {str(e)}")
        raise

def remove_from_waiting_list(db: Session, patient_id: int) -> bool:
    """
    從候診清單中移除患者
    
    參數:
        db: 資料庫會話
        patient_id: 患者ID
        
    返回:
        操作是否成功
    """
    try:
        result = db.query(WaitingList).filter(WaitingList.patient_id == patient_id).delete()
        db.commit()
        
        if result > 0:
            logger.info(f"成功從候診清單中移除患者 {patient_id}")
            return True
        else:
            logger.info(f"患者 {patient_id} 不在候診清單中，無需移除")
            return False
            
    except Exception as e:
        db.rollback()
        logger.error(f"從候診清單中移除患者時出錯: {str(e)}")
        raise 