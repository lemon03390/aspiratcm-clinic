from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
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


class StructuredInstructions(BaseModel):
    total_days: Optional[int] = 7
    times_per_day: Optional[int] = 2
    timing: Optional[str] = "早晚服"


class PrescriptionCreate(BaseModel):
    instructions: Optional[str] = None
    structured_instructions: Optional[StructuredInstructions] = None
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
    structured_instructions: Optional[StructuredInstructions] = None
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
        clean_observation_field(medical_record)
        
        # 創建主記錄
        db_record = create_main_record(medical_record, db)
        
        # 添加診斷記錄，確保即使沒有診斷資料也創建一個空的診斷記錄
        if medical_record.diagnosis:
            create_diagnosis_record(db_record.id, medical_record.diagnosis, db)
        else:
            # 創建一個空的診斷記錄
            empty_diagnosis = DiagnosisCreate(
                modern_diseases=[],
                cm_syndromes=[],
                cm_principle=None
            )
            create_diagnosis_record(db_record.id, empty_diagnosis, db)
            
        # 添加處方記錄，確保即使沒有處方資料也創建一個空的處方記錄    
        if medical_record.prescription and medical_record.prescription.herbs:
            create_prescription_record(db_record.id, medical_record.prescription, db)
        else:
            # 創建一個空的處方記錄
            empty_prescription = PrescriptionCreate(
                instructions="",
                structured_instructions=StructuredInstructions(
                    total_days=7,
                    times_per_day=2,
                    timing="早晚服"
                ),
                herbs=[]
            )
            create_prescription_record(db_record.id, empty_prescription, db)
            
        # 添加治療記錄，確保即使沒有治療資料也創建一個空的治療記錄    
        if medical_record.treatment and medical_record.treatment.treatment_items:
            _extracted_from_create_treatment_record_4(
                medical_record.treatment, db_record.id, db
            )
        else:
            # 創建一個空的治療方法記錄
            empty_treatment = TreatmentCreate(
                treatment_items=[]
            )
            _extracted_from_create_treatment_record_4(
                empty_treatment, db_record.id, db
            )

        # 提交所有更改
        db.commit()
        
        # 強制使用完整查詢，確保關聯數據被正確加載
        refreshed_record = reload_record_with_relations(db_record.id, db)
            
        # 從候診清單中移除患者
        try_remove_from_waiting_list(medical_record.patient_id, db)

        # 返回響應數據，確保有完整的資料結構
        logger.info(f"成功返回完整醫療記錄: id={refreshed_record.id}, record_id={refreshed_record.record_id}")
        logger.debug(f"診斷資料數量: {len(refreshed_record.diagnoses) if hasattr(refreshed_record, 'diagnoses') else 0}")
        logger.debug(f"處方資料數量: {len(refreshed_record.prescriptions) if hasattr(refreshed_record, 'prescriptions') else 0}")
        logger.debug(f"治療資料數量: {len(refreshed_record.treatments) if hasattr(refreshed_record, 'treatments') else 0}")
        
        return refreshed_record

    except Exception as e:
        db.rollback()
        logger.error(f"創建醫療記錄失敗: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"創建醫療記錄失敗: {str(e)}",
        ) from e


def clean_observation_field(medical_record: MedicalRecordCreate) -> None:
    """清理觀察欄位，確保它始終是字串"""
    if medical_record.observation is None or medical_record.observation == {} or not isinstance(medical_record.observation, str):
        medical_record.observation = ""


def create_main_record(medical_record: MedicalRecordCreate, db: Session) -> MedicalRecord:
    """創建主醫療記錄"""
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
    logger.info(f"創建病歷主記錄成功，ID: {db_record.id}, record_id: {db_record.record_id}")
    return db_record


def create_diagnosis_record(medical_record_id: int, diagnosis_data: DiagnosisCreate, db: Session) -> None:
    """創建診斷記錄"""
    try:
        # 確保 modern_diseases 和 cm_syndromes 始終為列表
        modern_diseases = diagnosis_data.modern_diseases or []
        cm_syndromes = diagnosis_data.cm_syndromes or []

        # 過濾空值，確保列表項目有有效值
        modern_diseases = [d for d in modern_diseases if d and (isinstance(d, str) and d.strip())]
        cm_syndromes = [s for s in cm_syndromes if s and (isinstance(s, str) and s.strip())]

        logger.info(f"準備添加診斷資料: 現代疾病 {modern_diseases}, 中醫證候 {cm_syndromes}")

        # 即使沒有診斷資料，也要創建診斷記錄，避免查詢時出現 null
        diagnosis = Diagnosis(
            medical_record_id=medical_record_id,
            modern_diseases=modern_diseases or [],
            cm_syndromes=cm_syndromes or [],
            cm_principle=diagnosis_data.cm_principle or ''
        )
        _extracted_from_create_diagnosis_record_21(db, diagnosis, '診斷資料添加成功，ID: ')
    except Exception as e:
        logger.error(f"創建診斷記錄失敗: {str(e)}")
        # 如果出錯，仍然嘗試添加一個空的診斷記錄
        try:
            empty_diagnosis = Diagnosis(
                medical_record_id=medical_record_id,
                modern_diseases=[],
                cm_syndromes=[],
                cm_principle=''
            )
            _extracted_from_create_diagnosis_record_21(
                db, empty_diagnosis, '創建空診斷記錄成功，ID: '
            )
        except Exception as inner_e:
            logger.error(f"創建空診斷記錄也失敗: {str(inner_e)}")
            raise


# TODO Rename this here and in `create_diagnosis_record`
def _extracted_from_create_diagnosis_record_21(db, arg1, arg2):
    db.add(arg1)
    db.flush()  # 確保診斷有ID
    logger.info(f"{arg2}{arg1.id}")


def create_prescription_record(medical_record_id: int, prescription_data: PrescriptionCreate, db: Session) -> None:
    """創建處方記錄"""
    try:
        logger.info(f"準備添加處方資料: 服用說明 {prescription_data.instructions}, 藥材數量 {len(prescription_data.herbs)}")
        
        prescription = Prescription(
            medical_record_id=medical_record_id,
            instructions=prescription_data.instructions or ""
        )
        
        # 儲存結構化服法為JSON
        if prescription_data.structured_instructions:
            # 如果prescription.structured_data不存在，則初始化為空字典
            if not hasattr(prescription, 'structured_data') or prescription.structured_data is None:
                prescription.structured_data = {}
            
            # 將structured_instructions存入structured_data字典
            try:
                prescription.structured_data = {
                    "structured_instructions": prescription_data.structured_instructions.dict(),
                    **(prescription.structured_data or {})
                }
            except Exception as e:
                logger.error(f"處理結構化服法資料時出錯: {str(e)}")
                # 使用默認值
                prescription.structured_data = {
                    "structured_instructions": {
                        "total_days": 7,
                        "times_per_day": 2,
                        "timing": "早晚服"
                    }
                }
        else:
            # 使用默認值
            prescription.structured_data = {
                "structured_instructions": {
                    "total_days": 7,
                    "times_per_day": 2,
                    "timing": "早晚服"
                }
            }
        
        db.add(prescription)
        db.flush()  # 確保處方有ID
        logger.info(f"處方記錄添加成功，ID: {prescription.id}, prescription_id: {prescription.prescription_id}")

        # 添加中藥項目，確保herbs是有效的列表
        if prescription_data.herbs and len(prescription_data.herbs) > 0:
            for idx, item in enumerate(prescription_data.herbs):
                if item and item.herb_name and item.herb_name.strip():  # 只添加有藥名的項目
                    create_herb_item(prescription.id, item, idx, db)
        else:
            logger.info("處方中沒有中藥項目，創建空處方")
    except Exception as e:
        logger.error(f"創建處方記錄失敗: {str(e)}")
        # 如果出錯，仍然嘗試添加一個空的處方記錄
        try:
            empty_prescription = Prescription(
                medical_record_id=medical_record_id,
                instructions="",
                structured_data={
                    "structured_instructions": {
                        "total_days": 7,
                        "times_per_day": 2,
                        "timing": "早晚服"
                    }
                }
            )
            db.add(empty_prescription)
            db.flush()
            logger.info(f"創建空處方記錄成功，ID: {empty_prescription.id}")
        except Exception as inner_e:
            logger.error(f"創建空處方記錄也失敗: {str(inner_e)}")
            raise


def create_herb_item(prescription_id: int, herb_data: HerbItemCreate, idx: int, db: Session) -> None:
    """創建中藥項目"""
    herb_item = HerbItem(
        prescription_id=prescription_id,
        herb_name=herb_data.herb_name,
        amount=herb_data.amount,
        unit=herb_data.unit,
        sequence=herb_data.sequence or idx,
        source=herb_data.source,
        structured_data=herb_data.structured_data
    )
    db.add(herb_item)
    db.flush()  # 確保每個中藥項目也成功寫入
    logger.info(f"中藥項目添加成功: {herb_item.herb_name}, 劑量: {herb_item.amount}{herb_item.unit}, ID: {herb_item.id}")


def create_treatment_record(medical_record_id: int, treatment_data: TreatmentCreate, db: Session) -> None:
    """創建治療記錄"""
    try:
        _extracted_from_create_treatment_record_4(
            treatment_data, medical_record_id, db
        )
    except Exception as e:
        logger.error(f"創建治療記錄失敗: {str(e)}")
        # 如果出錯，仍然嘗試添加一個空的治療記錄
        try:
            empty_treatment = _extracted_from_create_treatment_record_24(
                medical_record_id, db, '創建空治療記錄成功，ID: '
            )
        except Exception as inner_e:
            logger.error(f"創建空治療記錄也失敗: {str(inner_e)}")
            raise


# TODO Rename this here and in `create_treatment_record`
def _extracted_from_create_treatment_record_24(medical_record_id, db, arg2):
    result = Treatment(medical_record_id=medical_record_id)
    db.add(result)
    db.flush()
    logger.info(f"{arg2}{result.id}")
    return result


# TODO Rename this here and in `create_treatment_record`
def _extracted_from_create_treatment_record_4(treatment_data, medical_record_id, db):
    logger.info(f"準備添加治療方法資料, 項目數量: {len(treatment_data.treatment_items)}")

    treatment = _extracted_from_create_treatment_record_24(
        medical_record_id, db, '治療記錄添加成功，ID: '
    )
    # 添加治療方法項目
    if treatment_data.treatment_items and len(treatment_data.treatment_items) > 0:
        valid_items = [item for item in treatment_data.treatment_items if item.method and item.method.strip()]
        for idx, item in enumerate(valid_items):
            create_treatment_item(treatment.id, item, idx, db)
    else:
        logger.info("治療記錄中沒有方法項目，創建空治療記錄")


def create_treatment_item(treatment_id: int, item_data: TreatmentItemCreate, idx: int, db: Session) -> None:
    """創建治療方法項目"""
    treatment_item = TreatmentItem(
        treatment_id=treatment_id,
        method=item_data.method,
        target=item_data.target,
        description=item_data.description,
        sequence=item_data.sequence or idx
    )
    db.add(treatment_item)
    db.flush()  # 確保每個治療方法項目也成功寫入
    logger.info(f"治療方法項目添加成功: {treatment_item.method}, ID: {treatment_item.id}")


def reload_record_with_relations(record_id: int, db: Session) -> MedicalRecord:
    """使用joinedload重新加載完整記錄，並確保所有關聯資料存在"""
    try:
        return _extracted_from_reload_record_with_relations_5(db, record_id)
    except Exception as e:
        logger.error(f"重新加載記錄時發生錯誤: {str(e)}")
        if (
            db_record := db.query(MedicalRecord)
            .filter(MedicalRecord.id == record_id)
            .first()
        ):
            db.refresh(db_record)
            return db_record
        raise e


# TODO Rename this here and in `reload_record_with_relations`
def _extracted_from_reload_record_with_relations_5(db, record_id):
    # 使用完整的關聯加載查詢
    refreshed_record = db.query(MedicalRecord).filter(
        MedicalRecord.id == record_id
    ).options(
        joinedload(MedicalRecord.diagnoses),
        joinedload(MedicalRecord.prescriptions).joinedload(Prescription.herbs),
        joinedload(MedicalRecord.treatments).joinedload(Treatment.treatment_items)
    ).first()

    if not refreshed_record:
        logger.warning(f"無法加載完整記錄，ID: {record_id}")
        db_record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
        if not db_record:
            logger.error(f"無法找到醫療記錄，ID: {record_id}")
            raise HTTPException(status_code=404, detail=f"無法找到醫療記錄 ID: {record_id}")

        # 先刷新基本記錄
        db.refresh(db_record)

        # 檢查並創建缺失的關聯記錄
        # 1. 檢查診斷記錄
        diagnoses = db.query(Diagnosis).filter(Diagnosis.medical_record_id == record_id).all()
        if not diagnoses:
            logger.warning(f"醫療記錄 {record_id} 缺少診斷記錄，創建空診斷記錄")
            empty_diagnosis = Diagnosis(
                medical_record_id=record_id,
                modern_diseases=[],
                cm_syndromes=[],
                cm_principle=""
            )
            db.add(empty_diagnosis)
            db.flush()

        # 2. 檢查處方記錄
        prescriptions = db.query(Prescription).filter(Prescription.medical_record_id == record_id).all()
        if not prescriptions:
            logger.warning(f"醫療記錄 {record_id} 缺少處方記錄，創建空處方記錄")
            empty_prescription = Prescription(
                medical_record_id=record_id,
                instructions="",
                structured_data={
                    "structured_instructions": {
                        "total_days": 7,
                        "times_per_day": 2,
                        "timing": "早晚服"
                    }
                }
            )
            db.add(empty_prescription)
            db.flush()

        # 3. 檢查治療記錄
        treatments = db.query(Treatment).filter(Treatment.medical_record_id == record_id).all()
        if not treatments:
            logger.warning(f"醫療記錄 {record_id} 缺少治療記錄，創建空治療記錄")
            empty_treatment = Treatment(
                medical_record_id=record_id
            )
            db.add(empty_treatment)
            db.flush()

        # 提交更改
        db.commit()

        # 重新查詢完整記錄
        refreshed_record = db.query(MedicalRecord).filter(
            MedicalRecord.id == record_id
        ).options(
            joinedload(MedicalRecord.diagnoses),
            joinedload(MedicalRecord.prescriptions).joinedload(Prescription.herbs),
            joinedload(MedicalRecord.treatments).joinedload(Treatment.treatment_items)
        ).first()

    # 再次確認關聯資料是否完整，仍不完整則記錄警告
    if not refreshed_record:
        logger.error(f"即使在修復嘗試後仍無法加載完整記錄，ID: {record_id}")
        return db_record  # 無奈之下返回基本記錄

    # 記錄加載的關聯數據情況
    logger.info(f"成功加載醫療記錄 {record_id} 的關聯數據:")
    logger.info(f"- 診斷記錄: {len(refreshed_record.diagnoses)}")
    logger.info(f"- 處方記錄: {len(refreshed_record.prescriptions)}")
    logger.info(f"- 治療記錄: {len(refreshed_record.treatments)}")

    return refreshed_record


def try_remove_from_waiting_list(patient_id: int, db: Session) -> None:
    """嘗試從候診清單中移除患者"""
    try:
        remove_from_waiting_list(db, patient_id)
        logger.info(f"患者 {patient_id} 已從候診清單中移除")
    except Exception as waiting_err:
        logger.error(f"從候診清單移除患者時出錯: {str(waiting_err)}")
        # 不中斷主流程，繼續


@router.get("/{record_id}", response_model=MedicalRecordResponse)
def get_medical_record(record_id: str, db: Session = Depends(get_db)):
    """獲取特定醫療記錄"""
    try:
        # 嘗試按ID或record_id查詢
        try:
            record_id_int = int(record_id)
            query = db.query(MedicalRecord).filter(MedicalRecord.id == record_id_int)
        except ValueError:
            query = db.query(MedicalRecord).filter(MedicalRecord.record_id == record_id)
        
        # 添加 joinedload 預加載所有關聯數據
        query = query.options(
            joinedload(MedicalRecord.diagnoses),
            joinedload(MedicalRecord.prescriptions).joinedload(Prescription.herbs),
            joinedload(MedicalRecord.treatments).joinedload(Treatment.treatment_items)
        )
        
        db_record = query.first()
        
        if not db_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="未找到該醫療記錄"
            )
        
        # 增強數據清理：確保 observation 格式正確
        if hasattr(db_record, 'observation') and (db_record.observation is None or db_record.observation == {} or isinstance(db_record.observation, dict) and not db_record.observation):
            db_record.observation = ""
        
        # 處理處方的結構化服法數據
        if db_record.prescriptions and len(db_record.prescriptions) > 0:
            prescription = db_record.prescriptions[0]
            # 如果有structured_data且包含structured_instructions
            if hasattr(prescription, 'structured_data') and prescription.structured_data and 'structured_instructions' in prescription.structured_data:
                # 將結構化服法數據設置到prescription中
                setattr(prescription, 'structured_instructions', prescription.structured_data.get('structured_instructions'))
            else:
                # 若無，提供默認值
                setattr(prescription, 'structured_instructions', {
                    "total_days": 7,
                    "times_per_day": 2,
                    "timing": "早晚服"
                })
        
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
    """獲取指定患者的醫療記錄（舊格式，保留向後兼容）"""
    # 調用新格式的端點處理函數
    logger.info(f"使用舊格式端點獲取患者 {patient_id} 的醫療記錄，重定向到新格式")
    return get_medical_records_by_patient(patient_id, limit, offset, db)


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
        # 修改查詢方式，使用 joinedload 預加載關聯數據
        records = db.query(MedicalRecord).filter(
            MedicalRecord.patient_id == patient_id
        ).options(
            joinedload(MedicalRecord.diagnoses),
            joinedload(MedicalRecord.prescriptions).joinedload(Prescription.herbs),
            joinedload(MedicalRecord.treatments).joinedload(Treatment.treatment_items)
        ).order_by(
            MedicalRecord.visit_date.desc()
        ).offset(offset).limit(limit).all()
        
        # 為診斷資料添加證候詳細資訊
        for record in records:
            # 清理數據格式
            if hasattr(record, 'observation') and (record.observation is None or record.observation == {} or isinstance(record.observation, dict) and not record.observation):
                record.observation = ""
            
            # 處理處方的結構化服法數據
            if record.prescriptions and len(record.prescriptions) > 0:
                prescription = record.prescriptions[0]
                # 如果有structured_data且包含structured_instructions
                if hasattr(prescription, 'structured_data') and prescription.structured_data and 'structured_instructions' in prescription.structured_data:
                    # 將結構化服法數據設置到prescription中
                    setattr(prescription, 'structured_instructions', prescription.structured_data.get('structured_instructions'))
                else:
                    # 若無，提供默認值
                    setattr(prescription, 'structured_instructions', {
                        "total_days": 7,
                        "times_per_day": 2,
                        "timing": "早晚服"
                    })
            
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