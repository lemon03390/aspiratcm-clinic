from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app.models.medical_record import (
    MedicalRecord, Diagnosis, Prescription, HerbItem, Treatment, TreatmentItem
)
from app.schemas.medical_records import DiagnosisCreate, DiagnosisUpdate, DiagnosisResponse, SyndromeInfo
from app.utils.logger import get_logger
from app.utils.waiting_list_helper import remove_from_waiting_list
from app.utils.syndrome_helper import enrich_syndromes, get_syndrome_info

logger = get_logger(__name__)
router = APIRouter()


# === 模型定義 ===

class HerbItemCreate(BaseModel):
    herb_name: str
    amount: str
    unit: Optional[str] = "g"
    sequence: Optional[int] = 0
    source: Optional[str] = "manual"
    structured_data: Optional[Dict[str, Any]] = None


class PrescriptionCreate(BaseModel):
    instructions: Optional[str] = None
    herbs: List[HerbItemCreate]


class TreatmentItemCreate(BaseModel):
    method: str
    target: Optional[str] = None
    description: Optional[str] = None
    sequence: Optional[int] = 0


class TreatmentCreate(BaseModel):
    treatment_items: List[TreatmentItemCreate]


class MedicalRecordCreate(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_id: Optional[int] = None
    is_first_visit: Optional[bool] = False
    chief_complaint: Optional[str] = None
    present_illness: Optional[str] = None
    observation: Optional[str] = None
    left_pulse: Optional[str] = None
    right_pulse: Optional[str] = None
    tongue_quality: Optional[str] = None
    tongue_shape: Optional[str] = None
    tongue_color: Optional[str] = None
    tongue_coating: Optional[str] = None
    menstruation_start: Optional[datetime] = None
    menstruation_end: Optional[datetime] = None
    diagnosis: Optional[DiagnosisCreate] = None
    prescription: Optional[PrescriptionCreate] = None
    treatment: Optional[TreatmentCreate] = None


class HerbItemResponse(BaseModel):
    id: int
    herb_name: str
    amount: str
    unit: str
    sequence: int
    source: Optional[str] = "manual"
    structured_data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class PrescriptionResponse(BaseModel):
    id: int
    prescription_id: str
    instructions: Optional[str] = None
    herbs: List[HerbItemResponse]

    class Config:
        from_attributes = True


class TreatmentItemResponse(BaseModel):
    id: int
    method: str
    target: Optional[str] = None
    description: Optional[str] = None
    sequence: int

    class Config:
        from_attributes = True


class TreatmentResponse(BaseModel):
    id: int
    treatment_items: List[TreatmentItemResponse]

    class Config:
        from_attributes = True


class MedicalRecordResponse(BaseModel):
    id: int
    record_id: str
    patient_id: int
    doctor_id: int
    appointment_id: Optional[int] = None
    visit_date: datetime
    is_first_visit: bool
    chief_complaint: Optional[str] = None
    present_illness: Optional[str] = None
    observation: Optional[str] = None
    left_pulse: Optional[str] = None
    right_pulse: Optional[str] = None
    tongue_quality: Optional[str] = None
    tongue_shape: Optional[str] = None
    tongue_color: Optional[str] = None
    tongue_coating: Optional[str] = None
    menstruation_start: Optional[datetime] = None
    menstruation_end: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    diagnosis: Optional[DiagnosisResponse] = None
    prescription: Optional[PrescriptionResponse] = None
    treatment: Optional[TreatmentResponse] = None

    class Config:
        from_attributes = True


# === API端點 ===

@router.post("/", response_model=MedicalRecordResponse, status_code=status.HTTP_201_CREATED)
def create_medical_record(medical_record: MedicalRecordCreate, db: Session = Depends(get_db)):
    """創建新的醫療記錄"""
    try:
        # 清理觀察欄位，確保它始終是字串
        if medical_record.observation is None or medical_record.observation == {} or not isinstance(medical_record.observation, str):
            medical_record.observation = ""

        # 創建主記錄
        db_record = MedicalRecord(
            patient_id=medical_record.patient_id,
            doctor_id=medical_record.doctor_id,
            appointment_id=medical_record.appointment_id,
            is_first_visit=medical_record.is_first_visit,
            chief_complaint=medical_record.chief_complaint,
            present_illness=medical_record.present_illness,
            observation=medical_record.observation,
            left_pulse=medical_record.left_pulse,
            right_pulse=medical_record.right_pulse,
            tongue_quality=medical_record.tongue_quality,
            tongue_shape=medical_record.tongue_shape,
            tongue_color=medical_record.tongue_color,
            tongue_coating=medical_record.tongue_coating,
            menstruation_start=medical_record.menstruation_start,
            menstruation_end=medical_record.menstruation_end
        )
        db.add(db_record)
        db.flush()  # 確保主記錄有ID

        # 添加診斷記錄
        if medical_record.diagnosis:
            # 確保 modern_diseases 和 cm_syndromes 始終為列表
            modern_diseases = medical_record.diagnosis.modern_diseases or []
            cm_syndromes = medical_record.diagnosis.cm_syndromes or []

            diagnosis = Diagnosis(
                medical_record_id=db_record.id,
                modern_diseases=modern_diseases,
                cm_syndromes=cm_syndromes,
                cm_principle=medical_record.diagnosis.cm_principle
            )
            db.add(diagnosis)

        # 添加處方記錄
        if medical_record.prescription:
            prescription = Prescription(
                medical_record_id=db_record.id,
                instructions=medical_record.prescription.instructions
            )
            db.add(prescription)
            db.flush()  # 確保處方有ID

            # 添加中藥項目
            for item in medical_record.prescription.herbs:
                herb_item = HerbItem(
                    prescription_id=prescription.id,
                    herb_name=item.herb_name,
                    amount=item.amount,
                    unit=item.unit,
                    sequence=item.sequence,
                    source=item.source,
                    structured_data=item.structured_data
                )
                db.add(herb_item)

        # 添加治療記錄
        if medical_record.treatment:
            treatment = Treatment(
                medical_record_id=db_record.id
            )
            db.add(treatment)
            db.flush()  # 確保治療記錄有ID

            # 添加治療方法項目
            for item in medical_record.treatment.treatment_items:
                treatment_item = TreatmentItem(
                    treatment_id=treatment.id,
                    method=item.method,
                    target=item.target,
                    description=item.description,
                    sequence=item.sequence
                )
                db.add(treatment_item)

        db.commit()
        db.refresh(db_record)

        # 創建醫療記錄後，從候診清單中移除患者
        try:
            remove_from_waiting_list(db, medical_record.patient_id)
            logger.info(f"患者 {medical_record.patient_id} 已從候診清單中移除")
        except Exception as waiting_err:
            logger.error(f"從候診清單移除患者時出錯: {str(waiting_err)}")
            # 不中斷主流程，繼續

        # 返回響應數據
        return db_record

    except Exception as e:
        db.rollback()
        logger.error(f"創建醫療記錄失敗: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"創建醫療記錄失敗: {str(e)}",
        ) from e


@router.get("/{record_id}", response_model=MedicalRecordResponse)
def get_medical_record(record_id: str, db: Session = Depends(get_db)):
    """獲取特定醫療記錄"""
    try:
        # 嘗試按ID或record_id查詢
        try:
            record_id_int = int(record_id)
            db_record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id_int).first()
        except ValueError:
            db_record = db.query(MedicalRecord).filter(MedicalRecord.record_id == record_id).first()
        
        if not db_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="未找到該醫療記錄"
            )
        
        # 增強數據清理：確保 observation 格式正確
        if hasattr(db_record, 'observation') and (db_record.observation is None or db_record.observation == {} or isinstance(db_record.observation, dict) and not db_record.observation):
            db_record.observation = ""
        
        # 為診斷資料添加證候詳細資訊並確保列表類型正確
        if db_record.diagnoses and len(db_record.diagnoses) > 0:
            # 取得最新的診斷
            diagnosis = db_record.diagnoses[0]
            
            # 確保 modern_diseases 和 cm_syndromes 始終為列表
            if diagnosis.modern_diseases is None:
                diagnosis.modern_diseases = []
            if diagnosis.cm_syndromes is None:
                diagnosis.cm_syndromes = []
            
            try:
                # 將 cm_syndromes 列表轉換為完整的證候資訊
                syndrome_info_list = [
                    SyndromeInfo(**get_syndrome_info(code))
                    for code in diagnosis.cm_syndromes if code
                ]
                
                # 在不修改 DB 模型的情況下附加這個資訊
                setattr(diagnosis, 'cm_syndromes_info', syndrome_info_list)
            except Exception as e:
                logger.error(f"處理診斷證候資訊時出錯: {str(e)}")
                # 使用空列表作為替代，確保響應不會失敗
                setattr(diagnosis, 'cm_syndromes_info', [])
        
        return db_record
    
    except HTTPException as he:
        # 直接重新拋出HTTP異常
        raise he
    except Exception as e:
        logger.error(f"獲取醫療記錄 {record_id} 時出錯: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"獲取醫療記錄失敗: {str(e)}"
        ) from e


@router.get("/patient/{patient_id}", response_model=List[MedicalRecordResponse])
def get_patient_medical_records(
    patient_id: int, 
    limit: int = Query(20, description="每頁記錄數"),
    offset: int = Query(0, description="跳過的記錄數"),
    db: Session = Depends(get_db)
):
    """獲取指定患者的醫療記錄"""
    records = db.query(MedicalRecord).filter(
        MedicalRecord.patient_id == patient_id
    ).order_by(
        MedicalRecord.visit_date.desc()
    ).offset(offset).limit(limit).all()
    
    # 為診斷資料添加證候詳細資訊
    for record in records:
        # 清理數據格式
        if hasattr(record, 'observation') and (record.observation == {} or record.observation is None):
            record.observation = ""
        
        if record.diagnoses and record.diagnoses[0]:
            # 取得最新的診斷
            diagnosis = record.diagnoses[0]
            
            # 確保 modern_diseases 和 cm_syndromes 始終為列表
            if diagnosis.modern_diseases is None:
                diagnosis.modern_diseases = []
            if diagnosis.cm_syndromes is None:
                diagnosis.cm_syndromes = []
            
            # 將 cm_syndromes 列表轉換為完整的證候資訊
            syndrome_info_list = [
                SyndromeInfo(**get_syndrome_info(code))
                for code in diagnosis.cm_syndromes if code
            ]
            
            # 在不修改 DB 模型的情況下附加這個資訊
            setattr(diagnosis, 'cm_syndromes_info', syndrome_info_list)
    
    return records


@router.get("/", response_model=List[MedicalRecordResponse])
def get_medical_records(
    patient_id: Optional[int] = Query(None, description="患者ID"),
    doctor_id: Optional[int] = Query(None, description="醫師ID"),
    start_date: Optional[datetime] = Query(None, description="開始日期"),
    end_date: Optional[datetime] = Query(None, description="結束日期"),
    limit: int = Query(20, description="每頁記錄數"),
    offset: int = Query(0, description="跳過的記錄數"),
    db: Session = Depends(get_db)
):
    """獲取醫療記錄列表，支援按患者、醫師、日期範圍篩選"""
    query = db.query(MedicalRecord)
    
    if patient_id:
        query = query.filter(MedicalRecord.patient_id == patient_id)
    
    if doctor_id:
        query = query.filter(MedicalRecord.doctor_id == doctor_id)
    
    if start_date:
        query = query.filter(MedicalRecord.visit_date >= start_date)
    
    if end_date:
        query = query.filter(MedicalRecord.visit_date <= end_date)
    
    total = query.count()
    return query.order_by(MedicalRecord.visit_date.desc()).offset(offset).limit(limit).all()


@router.patch("/{record_id}", response_model=MedicalRecordResponse)
def update_medical_record(
    record_id: str, 
    update_data: Dict[str, Any], 
    db: Session = Depends(get_db)
):
    """更新醫療記錄"""
    # 查找醫療記錄
    db_record = get_record_by_id(db, record_id)
    if not db_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到該醫療記錄"
        )

    try:
        # 更新主記錄欄位
        update_main_record(db_record, update_data)
        
        # 更新診斷資料
        if 'diagnosis' in update_data and update_data['diagnosis']:
            update_diagnosis(db, db_record.id, update_data['diagnosis'])
            
        # 更新處方資料
        if 'prescription' in update_data and update_data['prescription']:
            update_prescription(db, db_record.id, update_data['prescription'])
            
        # 更新治療資料
        if 'treatment' in update_data and update_data['treatment']:
            update_treatment(db, db_record.id, update_data['treatment'])
            
        db.commit()
        db.refresh(db_record)

        # 更新醫療記錄後，從候診清單中移除患者
        try:
            remove_from_waiting_list(db, db_record.patient_id)
            logger.info(f"患者 {db_record.patient_id} 已從候診清單中移除")
        except Exception as waiting_err:
            logger.error(f"從候診清單移除患者時出錯: {str(waiting_err)}")
            # 不中斷主流程，繼續

        return db_record

    except Exception as e:
        db.rollback()
        logger.error(f"更新醫療記錄失敗: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新醫療記錄失敗: {str(e)}"
        ) from e


def get_record_by_id(db: Session, record_id: str) -> Optional[MedicalRecord]:
    """根據ID或record_id獲取醫療記錄"""
    try:
        record_id_int = int(record_id)
        return db.query(MedicalRecord).filter(MedicalRecord.id == record_id_int).first()
    except ValueError:
        return db.query(MedicalRecord).filter(MedicalRecord.record_id == record_id).first()


def update_main_record(db_record: MedicalRecord, update_data: Dict[str, Any]) -> None:
    """更新主記錄欄位"""
    for key, value in update_data.items():
        if key not in ['diagnosis', 'prescription', 'treatment'] and hasattr(db_record, key):
            setattr(db_record, key, value)
    
    # 確保觀察欄位為字串
    if hasattr(db_record, 'observation') and (db_record.observation == {} or db_record.observation is None):
        db_record.observation = ""


def update_diagnosis(db: Session, medical_record_id: int, diagnosis_data: Dict[str, Any]) -> None:
    """更新診斷資料"""
    # 檢查並獲取診斷記錄
    diagnosis = db.query(Diagnosis).filter(Diagnosis.medical_record_id == medical_record_id).first()
    
    # 確保現代疾病和證候為有效列表
    modern_diseases = diagnosis_data.get('modern_diseases') or []
    cm_syndromes = diagnosis_data.get('cm_syndromes') or []
    
    if diagnosis:
        # 更新現有診斷
        diagnosis.modern_diseases = modern_diseases
        diagnosis.cm_syndromes = cm_syndromes
        diagnosis.cm_principle = diagnosis_data.get('cm_principle')
    else:
        # 創建新診斷
        diagnosis = Diagnosis(
            medical_record_id=medical_record_id,
            modern_diseases=modern_diseases,
            cm_syndromes=cm_syndromes,
            cm_principle=diagnosis_data.get('cm_principle')
        )
        db.add(diagnosis)


def update_prescription(db: Session, medical_record_id: int, prescription_data: Dict[str, Any]) -> None:
    """更新處方資料"""
    if (
        prescription := db.query(Prescription)
        .filter(Prescription.medical_record_id == medical_record_id)
        .first()
    ):
        # 更新處方說明
        if 'instructions' in prescription_data:
            prescription.instructions = prescription_data['instructions']

        # 處理中藥項目
        if 'herbs' in prescription_data:
            # 先刪除現有項目
            db.query(HerbItem).filter(HerbItem.prescription_id == prescription.id).delete()

            # 添加新項目
            add_herb_items(db, prescription.id, prescription_data['herbs'])
    else:
        # 創建新處方
        prescription = Prescription(
            medical_record_id=medical_record_id,
            instructions=prescription_data.get('instructions')
        )
        db.add(prescription)
        db.flush()

        # 添加中藥項目
        if 'herbs' in prescription_data:
            add_herb_items(db, prescription.id, prescription_data['herbs'])


def add_herb_items(db: Session, prescription_id: int, herbs_data: List[Dict[str, Any]]) -> None:
    """添加中藥項目"""
    for idx, herb_data in enumerate(herbs_data):
        herb_item = HerbItem(
            prescription_id=prescription_id,
            herb_name=herb_data.get('herb_name', ''),
            amount=herb_data.get('amount', '0'),
            unit=herb_data.get('unit', 'g'),
            sequence=herb_data.get('sequence', idx),
            source=herb_data.get('source', 'manual'),
            structured_data=herb_data.get('structured_data')
        )
        db.add(herb_item)


def update_treatment(db: Session, medical_record_id: int, treatment_data: Dict[str, Any]) -> None:
    """更新治療資料"""
    if (
        treatment := db.query(Treatment)
        .filter(Treatment.medical_record_id == medical_record_id)
        .first()
    ):
        # 處理治療項目
        if 'treatment_items' in treatment_data:
            # 先刪除現有項目
            db.query(TreatmentItem).filter(TreatmentItem.treatment_id == treatment.id).delete()

            # 添加新項目
            add_treatment_items(db, treatment.id, treatment_data['treatment_items'])
    else:
        # 創建新治療記錄
        treatment = Treatment(
            medical_record_id=medical_record_id
        )
        db.add(treatment)
        db.flush()

        # 添加治療項目
        if 'treatment_items' in treatment_data:
            add_treatment_items(db, treatment.id, treatment_data['treatment_items'])


def add_treatment_items(db: Session, treatment_id: int, items_data: List[Dict[str, Any]]) -> None:
    """添加治療項目"""
    for idx, item_data in enumerate(items_data):
        treatment_item = TreatmentItem(
            treatment_id=treatment_id,
            method=item_data.get('method', ''),
            target=item_data.get('target'),
            description=item_data.get('description'),
            sequence=item_data.get('sequence', idx)
        )
        db.add(treatment_item)


@router.get("/by-patient/{patient_id}", response_model=List[MedicalRecordResponse])
def get_medical_records_by_patient(
    patient_id: int, 
    limit: int = Query(20, description="每頁記錄數"),
    offset: int = Query(0, description="跳過的記錄數"),
    db: Session = Depends(get_db)
):
    """獲取指定患者的醫療記錄"""
    try:
        records = db.query(MedicalRecord).filter(
            MedicalRecord.patient_id == patient_id
        ).order_by(
            MedicalRecord.visit_date.desc()
        ).offset(offset).limit(limit).all()
        
        # 為診斷資料添加證候詳細資訊
        for record in records:
            # 增強數據清理：確保 observation 格式正確
            if hasattr(record, 'observation') and (record.observation is None or record.observation == {} or isinstance(record.observation, dict) and not record.observation):
                record.observation = ""
                
            if record.diagnoses and len(record.diagnoses) > 0:
                # 取得最新的診斷
                diagnosis = record.diagnoses[0]
                
                # 確保 modern_diseases 和 cm_syndromes 始終為列表
                if diagnosis.modern_diseases is None:
                    diagnosis.modern_diseases = []
                if diagnosis.cm_syndromes is None:
                    diagnosis.cm_syndromes = []
                
                try:
                    # 將 cm_syndromes 列表轉換為完整的證候資訊
                    syndrome_info_list = [
                        SyndromeInfo(**get_syndrome_info(code))
                        for code in diagnosis.cm_syndromes if code
                    ]
                    
                    # 在不修改 DB 模型的情況下附加這個資訊
                    setattr(diagnosis, 'cm_syndromes_info', syndrome_info_list)
                except Exception as e:
                    logger.error(f"處理患者 {patient_id} 診斷證候資訊時出錯: {str(e)}")
                    # 使用空列表作為替代，確保響應不會失敗
                    setattr(diagnosis, 'cm_syndromes_info', [])
        
        return records
    
    except Exception as e:
        logger.error(f"獲取患者 {patient_id} 醫療記錄時出錯: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"獲取患者醫療記錄失敗: {str(e)}"
        ) from e 