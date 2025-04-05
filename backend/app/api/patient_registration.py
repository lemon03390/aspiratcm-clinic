from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field, validator, EmailStr, constr
import re
import json
from app.db import get_db
from app.models.models import Patient, Doctor, Appointment
from app.utils.time import now_hk

router = APIRouter()

# 基礎疾病、藥物過敏和食物過敏的列表
BASIC_DISEASES = ["我沒有任何基礎病", "高血壓", "糖尿病", "心臟病", "肝臟疾病", "腎臟疾病", "其他，請列明"]
DRUG_ALLERGIES = ["我沒有任何藥物過敏", "青黴素", "磺胺類", "阿司匹林", "非甾體抗炎藥", "其他，請列明"]
FOOD_ALLERGIES = ["我沒有任何食物過敏", "海鮮", "花生", "蛋類", "牛奶", "麩質", "其他，請列明"]

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
    
    basic_diseases: List[str] = Field(..., description="基礎疾病")
    drug_allergies: List[str] = Field(..., description="藥物過敏")
    food_allergies: List[str] = Field(..., description="食物過敏")
    
    has_appointment: bool = Field(False, description="是否已有預約")
    doctor_id: Optional[int] = Field(None, description="應診醫師")
    data_source: str = Field(..., description="資料來源")
    
    region: str = Field(..., description="居住地區 - 主區域")
    district: str = Field(..., description="居住地區 - 區")
    sub_district: str = Field(..., description="居住地區 - 細分地區")
    
    # 自定義驗證
    @validator("basic_diseases")
    def validate_basic_diseases(cls, v):
        if not v or len(v) == 0:
            raise ValueError("請至少選擇一項基礎疾病選項")
        for item in v:
            if item not in BASIC_DISEASES and "其他，請列明" not in item:
                raise ValueError(f"基礎疾病選項 '{item}' 無效")
        return v
    
    @validator("drug_allergies")
    def validate_drug_allergies(cls, v):
        if not v or len(v) == 0:
            raise ValueError("請至少選擇一項藥物過敏選項")
        for item in v:
            if item not in DRUG_ALLERGIES and "其他，請列明" not in item:
                raise ValueError(f"藥物過敏選項 '{item}' 無效")
        return v
    
    @validator("food_allergies")
    def validate_food_allergies(cls, v):
        if not v or len(v) == 0:
            raise ValueError("請至少選擇一項食物過敏選項")
        for item in v:
            if item not in FOOD_ALLERGIES and "其他，請列明" not in item:
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
        orm_mode = True


class PatientUpdate(BaseModel):
    chinese_name: Optional[str] = None
    english_name: Optional[str] = None
    birth_date: Optional[date] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    
    basic_diseases: Optional[List[str]] = None
    drug_allergies: Optional[List[str]] = None
    food_allergies: Optional[List[str]] = None
    
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
    patient = db.query(Patient).filter(Patient.id_number == id_number).first()
    return {"exists": patient is not None, "patient": PatientResponse.from_orm(patient) if patient else None}


# 檢查患者是否存在（依據姓名和身份證號碼）
@router.get("/check-patient")
async def check_patient(
    chinese_name: Optional[str] = None,
    id_number: Optional[str] = None,
    phone_number: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Patient)
    
    if chinese_name:
        query = query.filter(Patient.chinese_name == chinese_name)
    if id_number:
        query = query.filter(Patient.id_number == id_number)
    if phone_number:
        query = query.filter(Patient.phone_number == phone_number)
    
    if not chinese_name and not id_number and not phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="請至少提供中文姓名、身份證號碼或聯絡電話中的一項"
        )
    
    patient = query.first()
    return {"exists": patient is not None, "patient": PatientResponse.from_orm(patient) if patient else None}


# 創建新患者
@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    # 檢查醫師是否存在
    if patient.doctor_id:
        doctor = db.query(Doctor).filter(Doctor.id == patient.doctor_id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"編號為 {patient.doctor_id} 的醫師不存在"
            )
    
    # 檢查身份證號碼是否已存在
    existing_patient = db.query(Patient).filter(Patient.id_number == patient.id_number).first()
    if existing_patient:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"具有此身份證號碼的患者已存在"
        )
    
    # 生成唯一掛號編號
    registration_number = generate_registration_number()
    
    # 設置 JSON 列
    db_patient = Patient(
        registration_number=registration_number,
        chinese_name=patient.chinese_name,
        english_name=patient.english_name,
        id_number=patient.id_number,
        birth_date=patient.birth_date,
        phone_number=patient.phone_number,
        email=patient.email,
        basic_diseases=patient.basic_diseases,
        drug_allergies=patient.drug_allergies,
        food_allergies=patient.food_allergies,
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
        return db_patient
    except IntegrityError as e:
        db.rollback()
        error_detail = str(e)
        if "unique constraint" in error_detail.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="患者資料衝突，可能身份證號碼或掛號編號已存在"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"創建患者時出錯: {error_detail}"
        )


# 獲取所有患者列表
@router.get("/", response_model=List[PatientResponse])
async def get_patients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    patients = db.query(Patient).offset(skip).limit(limit).all()
    return patients


# 獲取單個患者詳情
@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"編號為 {patient_id} 的患者不存在"
        )
    return patient


# 通過掛號編號獲取患者
@router.get("/by-registration-number/{registration_number}", response_model=PatientResponse)
async def get_patient_by_registration_number(registration_number: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.registration_number == registration_number).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"掛號編號為 {registration_number} 的患者不存在"
        )
    return patient


# 更新患者資料
@router.patch("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: int,
    patient_update: PatientUpdate,
    db: Session = Depends(get_db)
):
    db_patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"編號為 {patient_id} 的患者不存在"
        )
    
    # 檢查醫師是否存在
    if patient_update.doctor_id is not None:
        doctor = db.query(Doctor).filter(Doctor.id == patient_update.doctor_id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"編號為 {patient_update.doctor_id} 的醫師不存在"
            )
    
    # 更新資料
    update_data = patient_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_patient, key, value)
    
    try:
        db.commit()
        db.refresh(db_patient)
        return db_patient
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"更新患者資料時發生衝突: {str(e)}"
        )


# 刪除患者
@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    db_patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"編號為 {patient_id} 的患者不存在"
        )
    
    db.delete(db_patient)
    db.commit()
    return {"message": "患者已成功刪除"} 