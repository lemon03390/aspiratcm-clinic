from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from pydantic import BaseModel, Field, validator, EmailStr, constr
import re
import json
import logging
from app.db import get_db
from app.models import Patient, Doctor, Appointment, MedicalRecord, WaitingList
from app.utils.time import now_hk
from app.utils.waiting_list_helper import add_to_waiting_list, remove_from_waiting_list

# 設置日誌
logger = logging.getLogger(__name__)

router = APIRouter()

# 基礎疾病、藥物過敏和食物過敏的列表
BASIC_DISEASES = ["我沒有任何基礎病", "高血壓", "糖尿病", "心臟病", "肝臟疾病", "腎臟疾病", "其他，請列明"]
DRUG_ALLERGIES = ["我沒有任何藥物過敏", "青黴素", "磺胺類", "阿司匹林", "非甾體抗炎藥", "其他藥物，請列明"]
FOOD_ALLERGIES = ["我沒有任何食物過敏", "海鮮", "花生", "蛋類", "牛奶", "麩質", "其他食物，請列明"]

# 資料來源列表
DATA_SOURCES = ["朋友介紹", "Facebook", "Instagram", "Threads", "Google", "其他"]

# 地區資料列表
REGIONS = {
    "香港島": {
        "中西區": ["中環", "上環", "西營盤", "堅尼地城"],
        "灣仔區": ["灣仔", "銅鑼灣", "大坑", "跑馬地"],
        "東區": ["北角", "鰂魚涌", "太古", "筲箕灣", "柴灣", "小西灣"],
        "南區": ["香港仔", "田灣", "薄扶林", "赤柱", "淺水灣"],
    },
    "九龍": {
        "油尖旺區": ["油麻地", "佐敦", "尖沙咀", "大角咀"],
        "深水埗區": ["深水埗", "長沙灣", "石硤尾", "南昌"],
        "九龍城區": ["九龍城", "土瓜灣", "紅磡", "新蒲崗", "啟德"],
        "黃大仙區": ["黃大仙", "樂富", "鑽石山", "慈雲山"],
        "觀塘區": ["觀塘", "牛頭角", "藍田", "油塘"],
    },
    "新界": {
        "荃灣區": ["荃灣", "梨木樹", "楊屋道"],
        "屯門區": ["屯門市中心", "良景", "山景", "兆康"],
        "元朗區": ["元朗市中心", "朗屏", "洪水橋", "天水圍", "錦上路"],
        "北區": ["上水", "粉嶺", "聯和墟"],
        "大埔區": ["大埔市中心", "太和", "大埔墟"],
        "西貢區": ["西貢市", "將軍澳", "坑口", "寶琳"],
        "沙田區": ["沙田市中心", "馬鞍山", "大圍", "火炭"],
        "葵青區": ["葵涌", "青衣", "石籬", "葵芳"],
        "離島區": ["東涌", "長洲", "坪洲", "大嶼山", "梅窩"],
    },
}

# 生成唯一掛號編號
def generate_registration_number():
    now = now_hk()
    clinic_code = "ASPIRA_LCK"  # 診所簡碼
    timestamp = now.strftime("%Y%m%d%H%M")
    return f"{timestamp}{clinic_code}"


# 驗證患者請求模型
class PatientBase(BaseModel):
    chinese_name: str = Field(..., min_length=1, max_length=100, description="中文姓名")
    english_name: str = Field(..., min_length=1, max_length=100, description="英文姓名")
    id_number: str = Field(..., min_length=1, max_length=20, description="身份證或護照號碼")
    birth_date: date = Field(..., description="出生日期")
    phone_number: str = Field(..., min_length=8, max_length=20, description="聯絡電話")
    email: Optional[EmailStr] = Field(None, description="電郵地址")
    gender: Optional[str] = Field(None, description="性別")
    
    basic_diseases: List[str] = Field(..., description="基礎疾病")
    drug_allergies: List[str] = Field(..., description="藥物過敏")
    food_allergies: List[str] = Field(..., description="食物過敏")
    note: Optional[str] = Field(None, description="備註")
    chief_complaint: Optional[str] = Field(None, description="主訴")
    
    # 特殊患者標記
    is_troublesome: Optional[int] = Field(0, description="麻煩症患者標記 (0: 否, 1: 是)")
    is_contagious: Optional[int] = Field(0, description="傳染病患者標記 (0: 否, 1: 是)")
    special_note: Optional[str] = Field(None, description="特殊情況註記")
    
    has_appointment: bool = Field(False, description="是否已有預約")
    doctor_id: Optional[int] = Field(None, description="應診醫師")
    data_source: str = Field(..., description="資料來源")
    
    region: str = Field(..., description="居住地區 - 主區域")
    district: str = Field(..., description="居住地區 - 區")
    sub_district: str = Field(..., description="居住地區 - 細分地區")
    
    # 自定義驗證
    @validator("email", pre=True)
    def validate_email(cls, v):
        # 特殊處理：接受 no@no.com 作為有效的電子郵件
        return v
        
    @validator("basic_diseases")
    def validate_basic_diseases(cls, v):
        if not v or len(v) == 0:
            raise ValueError("請至少選擇一項基礎疾病選項")
        for item in v:
            if item not in BASIC_DISEASES and not item.startswith("其他，請列明:") and not item.startswith("其他:") and item != "其他症病，請列明":
                raise ValueError(f"基礎疾病選項 '{item}' 無效")
        return v
    
    @validator("drug_allergies")
    def validate_drug_allergies(cls, v):
        if not v or len(v) == 0:
            raise ValueError("請至少選擇一項藥物過敏選項")
        for item in v:
            if item not in DRUG_ALLERGIES and not item.startswith("其他，請列明:") and not item.startswith("其他藥物:") and item != "其他藥物，請列明":
                raise ValueError(f"藥物過敏選項 '{item}' 無效")
        return v
    
    @validator("food_allergies")
    def validate_food_allergies(cls, v):
        if not v or len(v) == 0:
            raise ValueError("請至少選擇一項食物過敏選項")
        for item in v:
            if item not in FOOD_ALLERGIES and not item.startswith("其他，請列明:") and not item.startswith("其他食物:") and item != "其他食物，請列明":
                raise ValueError(f"食物過敏選項 '{item}' 無效")
        return v
    
    @validator("data_source")
    def validate_data_source(cls, v):
        if v not in DATA_SOURCES:
            raise ValueError(f"資料來源 '{v}' 無效，有效選項: {', '.join(DATA_SOURCES)}")
        return v
    
    @validator("region")
    def validate_region(cls, v):
        if v not in REGIONS:
            raise ValueError(f"地區 '{v}' 無效，有效選項: {', '.join(REGIONS.keys())}")
        return v
    
    @validator("district")
    def validate_district(cls, v, values):
        region = values.get("region")
        if not region:
            return v
        
        if region in REGIONS and v not in REGIONS[region]:
            raise ValueError(f"'{region}' 區域中不存在地區 '{v}'")
        return v
    
    @validator("sub_district")
    def validate_sub_district(cls, v, values):
        region = values.get("region")
        district = values.get("district")
        if not region or not district:
            return v
        
        if (region in REGIONS and district in REGIONS[region] and 
            v not in REGIONS[region][district]):
            raise ValueError(f"'{district}' 地區中不存在細分地區 '{v}'")
        return v


class PatientCreate(PatientBase):
    pass


class PatientResponse(PatientBase):
    id: int
    registration_number: str
    registration_datetime: datetime
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PatientUpdate(BaseModel):
    chinese_name: Optional[str] = None
    english_name: Optional[str] = None
    birth_date: Optional[date] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    gender: Optional[str] = None
    
    basic_diseases: Optional[List[str]] = None
    drug_allergies: Optional[List[str]] = None
    food_allergies: Optional[List[str]] = None
    note: Optional[str] = None
    chief_complaint: Optional[str] = None
    
    # 特殊患者標記
    is_troublesome: Optional[int] = None
    is_contagious: Optional[int] = None
    special_note: Optional[str] = None
    
    doctor_id: Optional[int] = None
    data_source: Optional[str] = None
    
    region: Optional[str] = None
    district: Optional[str] = None
    sub_district: Optional[str] = None


# 獲取有效地區的列表
@router.get("/regions", response_model=Dict[str, Dict[str, List[str]]])
async def get_regions():
    return REGIONS


# 獲取基礎疾病、藥物過敏、食物過敏和資料來源的列表
@router.get("/reference-data")
async def get_reference_data():
    return {
        "basic_diseases": BASIC_DISEASES,
        "drug_allergies": DRUG_ALLERGIES,
        "food_allergies": FOOD_ALLERGIES,
        "data_sources": DATA_SOURCES,
        "regions": REGIONS
    }


# 檢查身份證/護照號碼是否已存在
@router.get("/check-id-number")
async def check_id_number(id_number: str, db: Session = Depends(get_db)):
    try:
        # 格式化身份證號碼，移除特殊字符
        formatted_id = re.sub(r'[\(\)]', '', id_number).strip()
        
        if patient := db.query(Patient).filter(Patient.id_number == formatted_id).first():
            return {"exists": True, "patient": PatientResponse.model_validate(patient)}
        return {"exists": False, "patient": None}
    except Exception as e:
        logger.error(f"檢查身份證號碼時出錯: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"處理身份證號碼查詢時出錯: {str(e)}"
        ) from e


# 檢查患者是否存在（依據姓名和身份證號碼）
@router.get("/check-patient")
async def check_patient(
    chinese_name: Optional[str] = None,
    id_number: Optional[str] = None,
    phone_number: Optional[str] = None,
    db: Session = Depends(get_db)
):
    try:
        if not any([chinese_name, id_number, phone_number]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="請至少提供中文姓名、身份證號碼或聯絡電話中的一項"
            )
        
        query = db.query(Patient)
        
        if chinese_name:
            query = query.filter(Patient.chinese_name == chinese_name)
        if id_number:
            # 格式化身份證號碼
            formatted_id = re.sub(r'[\(\)]', '', id_number).strip() if id_number else None
            query = query.filter(Patient.id_number == formatted_id)
        if phone_number:
            # 格式化電話號碼
            formatted_phone = re.sub(r'[\s\-\(\)]', '', phone_number) if phone_number else None
            query = query.filter(Patient.phone_number == formatted_phone)
        
        if patient := query.first():
            return {"exists": True, "patient": PatientResponse.model_validate(patient)}
        return {"exists": False, "patient": None}
    except HTTPException as he:
        # 直接重新拋出HTTP異常
        raise he
    except Exception as e:
        logger.error(f"檢查患者時出錯: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢患者資料時出錯: {str(e)}"
        ) from e


# 獲取所有患者列表
@router.get("/", response_model=List[PatientResponse])
async def get_patients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return db.query(Patient).offset(skip).limit(limit).all()


# 獲取候診患者列表
@router.get("/waiting-list", response_model=List[dict])
async def get_waiting_list(db: Session = Depends(get_db)) -> List[dict]:
    """從 waiting_list 表中獲取候診患者清單，包含特殊患者標記"""
    try:
        waiting_entries = db.query(WaitingList).order_by(WaitingList.created_at).all()
        result = process_waiting_entries(db, waiting_entries)
        logger.info(f"成功回傳候診清單，共 {len(result)} 名患者")
        return result
    except Exception as e:
        logger.error(f"獲取候診名單時發生錯誤: {str(e)}")
        return []  # 永不丟 422

def get_patient_waiting_data(db: Session, entry: WaitingList) -> dict:
    """從候診列表項目獲取患者詳細資訊"""
    if not (patient := db.query(Patient).filter(Patient.id == entry.patient_id).first()):
        return None
    
    return {
        "waiting_id": entry.id,
        "patient_id": patient.id,
        "registration_number": patient.registration_number,
        "chinese_name": patient.chinese_name,
        "is_troublesome": patient.is_troublesome,
        "is_contagious": patient.is_contagious,
        "special_note": patient.special_note,
        "doctor_id": entry.doctor_id,
        "waiting_since": entry.created_at
    }

def process_waiting_entries(db: Session, entries: List[WaitingList]) -> List[dict]:
    """處理候診清單條目，獲取患者詳細資訊"""
    result = []
    for entry in entries:
        try:
            if patient_data := get_patient_waiting_data(db, entry):
                # 添加 name 屬性以相容前端
                patient_data["name"] = patient_data["chinese_name"]
                result.append(patient_data)
        except Exception as inner_err:
            logger.error(f"處理候診患者 {entry.patient_id} 資料時出錯: {str(inner_err)}")
    return result


# 通過掛號編號獲取患者
@router.get("/by-registration-number/{registration_number}", response_model=PatientResponse)
async def get_patient_by_registration_number(registration_number: str, db: Session = Depends(get_db)):
    try:
        if not registration_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="掛號編號不能為空"
            )
        
        # 嘗試查詢患者資料
        patient = db.query(Patient).filter(Patient.registration_number == registration_number).first()
        if not patient:
            logger.warning(f"掛號編號為 {registration_number} 的患者不存在")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"掛號編號為 {registration_number} 的患者不存在"
            )
        return patient
    except HTTPException:
        # 直接重新拋出HTTP異常
        raise
    except Exception as e:
        logger.error(f"獲取患者資料失敗，掛號編號: {registration_number}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"獲取患者資料失敗，掛號編號: {registration_number}"
        ) from e


# 通過電話號碼獲取患者
@router.get("/by-phone-number/{phone_number}", response_model=PatientResponse)
async def get_patient_by_phone_number(phone_number: str, db: Session = Depends(get_db)):
    # 格式化電話號碼，移除特殊字符
    formatted_phone = re.sub(r'[\s\-\(\)]', '', phone_number)
    
    if not (patient := db.query(Patient).filter(Patient.phone_number == formatted_phone).first()):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"電話號碼為 {phone_number} 的患者不存在"
        )
    return patient


# 獲取單個患者詳情
@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: int, db: Session = Depends(get_db)):
    if not (patient := db.query(Patient).filter(Patient.id == patient_id).first()):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"編號為 {patient_id} 的患者不存在"
        )
    return patient


# 創建新患者
@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    # 檢查醫師是否存在
    if patient.doctor_id and not (doctor := db.query(Doctor).filter(Doctor.id == patient.doctor_id).first()):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"編號為 {patient.doctor_id} 的醫師不存在"
        )
    
    # 檢查身份證號碼是否已存在
    if db.query(Patient).filter(Patient.id_number == patient.id_number).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="具有此身份證號碼的患者已存在"
        )
    
    # 生成唯一掛號編號
    registration_number = generate_registration_number()
    
    # 組織 health_profile 欄位，整合患者健康相關數據供AI處理
    health_profile = {
        # 個人資料
        "chinese_name": patient.chinese_name,
        "english_name": patient.english_name,
        "gender": patient.gender,
        
        # 出生與地區信息
        "birth_date": str(patient.birth_date),
        "region": patient.region,
        "district": patient.district,
        "sub_district": patient.sub_district,
        
        # 健康相關信息
        "basic_diseases": patient.basic_diseases,
        "drug_allergies": patient.drug_allergies,
        "food_allergies": patient.food_allergies,
        
        # 診斷相關信息
        "chief_complaint": patient.chief_complaint,
        "note": patient.note,
        
        # 特殊患者標記
        "is_troublesome": patient.is_troublesome,
        "is_contagious": patient.is_contagious,
        "special_note": patient.special_note,
        
        # 其他相關信息
        "data_source": patient.data_source,
        "doctor_id": patient.doctor_id,
        
        # 元數據
        "created_at": now_hk().isoformat(),
    }
    
    # 設置 JSON 列
    db_patient = Patient(
        registration_number=registration_number,
        chinese_name=patient.chinese_name,
        english_name=patient.english_name,
        id_number=patient.id_number,
        birth_date=patient.birth_date,
        phone_number=patient.phone_number,
        email=patient.email,
        gender=patient.gender,
        basic_diseases=patient.basic_diseases,
        drug_allergies=patient.drug_allergies,
        food_allergies=patient.food_allergies,
        note=patient.note,
        chief_complaint=patient.chief_complaint,
        is_troublesome=patient.is_troublesome,
        is_contagious=patient.is_contagious,
        special_note=patient.special_note,
        health_profile=health_profile,
        has_appointment=patient.has_appointment,
        doctor_id=patient.doctor_id,
        data_source=patient.data_source,
        region=patient.region,
        district=patient.district,
        sub_district=patient.sub_district,
    )
    
    try:
        db.add(db_patient)
        db.commit()
        db.refresh(db_patient)
        
        # 將新患者添加到候診清單
        add_to_waiting_list(
            db=db,
            patient_id=db_patient.id,
            registration_number=db_patient.registration_number,
            chinese_name=db_patient.chinese_name,
            doctor_id=db_patient.doctor_id
        )
        
        return db_patient
    except IntegrityError as e:
        db.rollback()
        error_detail = str(e)
        if "unique constraint" in error_detail.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="患者資料衝突，可能身份證號碼或掛號編號已存在"
            ) from e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"創建患者時出錯: {error_detail}"
        ) from e


# 更新患者資料
@router.patch("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: int,
    patient_update: PatientUpdate,
    db: Session = Depends(get_db)
):
    if not (db_patient := db.query(Patient).filter(Patient.id == patient_id).first()):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"編號為 {patient_id} 的患者不存在"
        )
    
    # 檢查醫師是否存在
    if patient_update.doctor_id is not None:
        if not (doctor := db.query(Doctor).filter(Doctor.id == patient_update.doctor_id).first()):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"編號為 {patient_update.doctor_id} 的醫師不存在"
            )
    
    # 更新資料
    update_data = patient_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_patient, key, value)
    
    # 更新 health_profile，確保它反映最新的健康相關資料
    current_profile = db_patient.health_profile or {}
    
    # 更新個人資料
    if "chinese_name" in update_data:
        current_profile["chinese_name"] = update_data["chinese_name"]
    if "english_name" in update_data:
        current_profile["english_name"] = update_data["english_name"]
    if "gender" in update_data:
        current_profile["gender"] = update_data["gender"]
    
    # 更新地區資料
    if "region" in update_data:
        current_profile["region"] = update_data["region"]
    if "district" in update_data:
        current_profile["district"] = update_data["district"]
    if "sub_district" in update_data:
        current_profile["sub_district"] = update_data["sub_district"]
    
    # 更新健康相關資料
    if "basic_diseases" in update_data:
        current_profile["basic_diseases"] = update_data["basic_diseases"]
    if "drug_allergies" in update_data:
        current_profile["drug_allergies"] = update_data["drug_allergies"]
    if "food_allergies" in update_data:
        current_profile["food_allergies"] = update_data["food_allergies"]
    if "note" in update_data:
        current_profile["note"] = update_data["note"]
    if "chief_complaint" in update_data:
        current_profile["chief_complaint"] = update_data["chief_complaint"]
    
    # 更新特殊患者標記
    if "is_troublesome" in update_data:
        current_profile["is_troublesome"] = update_data["is_troublesome"]
    if "is_contagious" in update_data:
        current_profile["is_contagious"] = update_data["is_contagious"]
    if "special_note" in update_data:
        current_profile["special_note"] = update_data["special_note"]
    
    # 更新其他資料
    if "doctor_id" in update_data:
        current_profile["doctor_id"] = update_data["doctor_id"]
    if "data_source" in update_data:
        current_profile["data_source"] = update_data["data_source"]
    if "birth_date" in update_data:
        current_profile["birth_date"] = str(update_data["birth_date"])
    
    # 更新元數據
    current_profile["updated_at"] = now_hk().isoformat()
    
    # 設置更新後的 health_profile
    db_patient.health_profile = current_profile
    
    try:
        db.commit()
        db.refresh(db_patient)
        
        # 對於更新的患者，檢查是否需要將其添加到候診清單
        # 這通常發生在患者回訪時
        add_to_waiting_list(
            db=db,
            patient_id=db_patient.id,
            registration_number=db_patient.registration_number,
            chinese_name=db_patient.chinese_name,
            doctor_id=db_patient.doctor_id
        )
        
        return db_patient
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"更新患者資料時發生衝突: {str(e)}"
        ) from e


# 刪除患者
@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    if not (db_patient := db.query(Patient).filter(Patient.id == patient_id).first()):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"編號為 {patient_id} 的患者不存在"
        )
    
    db.delete(db_patient)
    db.commit()
    return {"message": "患者已成功刪除"}


# 刪除候診清單中的患者
@router.delete("/waiting-list/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_from_waiting_list(patient_id: int, db: Session = Depends(get_db)):
    """
    從候診清單中移除指定患者
    """
    try:
        # 調用移除函數
        result = remove_from_waiting_list(db, patient_id)
        
        return {"message": "患者已從候診清單中移除" if result else "患者不在候診清單中，無需移除"}
            
    except Exception as e:
        logger.error(f"移除候診患者時出錯: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"移除候診患者時出錯: {str(e)}"
        ) from e
