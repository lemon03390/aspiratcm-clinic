from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import json

from app.database import get_db
from app.models.medical_record import ReferenceData
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class ReferenceDataCreate(BaseModel):
    data_type: str
    data_key: str
    data_value: str
    data_description: Optional[str] = None
    data_extra: Optional[Dict[str, Any]] = None
    is_active: bool = True


class ReferenceDataResponse(BaseModel):
    id: int
    data_type: str
    data_key: str
    data_value: str
    data_description: Optional[str] = None
    data_extra: Optional[Dict[str, Any]] = None
    is_active: bool

    class Config:
        from_attributes = True


@router.get("/types", response_model=List[str])
def get_reference_data_types(db: Session = Depends(get_db)):
    """獲取所有參考資料類型"""
    types = db.query(ReferenceData.data_type).distinct().all()
    return [type[0] for type in types]


@router.get("/", response_model=List[ReferenceDataResponse])
def get_reference_data(
    data_type: Optional[str] = Query(None, description="參考資料類型"),
    q: Optional[str] = Query(None, description="搜尋關鍵字"),
    is_active: Optional[bool] = Query(True, description="是否僅顯示啟用項目"),
    db: Session = Depends(get_db)
):
    """獲取參考資料列表，支援按類型和關鍵字搜尋"""
    query = db.query(ReferenceData)
    
    if data_type:
        query = query.filter(ReferenceData.data_type == data_type)
    
    if is_active is not None:
        query = query.filter(ReferenceData.is_active == is_active)
    
    if q:
        query = query.filter(
            (ReferenceData.data_key.ilike(f"%{q}%")) | 
            (ReferenceData.data_value.ilike(f"%{q}%"))
        )
    
    return query.all()


@router.get("/{data_type}", response_model=List[ReferenceDataResponse])
def get_reference_data_by_type(data_type: str, db: Session = Depends(get_db)):
    """獲取特定類型的參考資料"""
    data = db.query(ReferenceData).filter(
        ReferenceData.data_type == data_type,
        ReferenceData.is_active == True
    ).all()
    
    if not data:
        raise HTTPException(status_code=404, detail=f"未找到類型 {data_type} 的參考資料")
    
    return data


@router.post("/", response_model=ReferenceDataResponse)
def create_reference_data(data: ReferenceDataCreate, db: Session = Depends(get_db)):
    """新增參考資料"""
    db_data = ReferenceData(
        data_type=data.data_type,
        data_key=data.data_key,
        data_value=data.data_value,
        data_description=data.data_description,
        data_extra=data.data_extra,
        is_active=data.is_active
    )
    db.add(db_data)
    db.commit()
    db.refresh(db_data)
    return db_data


@router.post("/batch", response_model=Dict[str, Any])
def batch_create_reference_data(data_type: str, data_list: List[Dict[str, Any]], db: Session = Depends(get_db)):
    """批量新增參考資料"""
    created_count = 0
    
    for item in data_list:
        # 檢查資料是否已存在
        existing = db.query(ReferenceData).filter(
            ReferenceData.data_type == data_type,
            ReferenceData.data_key == item.get("key", "")
        ).first()
        
        if not existing:
            db_data = ReferenceData(
                data_type=data_type,
                data_key=item.get("key", ""),
                data_value=item.get("value", ""),
                data_description=item.get("description", None),
                data_extra=item.get("extra", None),
                is_active=True
            )
            db.add(db_data)
            created_count += 1
    
    db.commit()
    return {"message": f"成功導入 {created_count} 筆 {data_type} 參考資料"}


@router.post("/import/json", response_model=Dict[str, Any])
def import_reference_data_from_json(data_type: str, json_data: str, db: Session = Depends(get_db)):
    """從JSON字符串導入參考資料"""
    try:
        data_list = json.loads(json_data)
        
        if not isinstance(data_list, list):
            raise HTTPException(status_code=400, detail="JSON資料必須是陣列格式")
        
        created_count = 0
        
        for item in data_list:
            if isinstance(item, str):
                # 若為純字串列表，字串即為value
                db_data = ReferenceData(
                    data_type=data_type,
                    data_key=item,
                    data_value=item,
                    is_active=True
                )
                db.add(db_data)
                created_count += 1
            elif isinstance(item, dict):
                # 若為物件列表，需處理key-value結構
                key = item.get("key", item.get("name", ""))
                value = item.get("value", item.get("label", key))
                
                if not key:
                    continue
                
                db_data = ReferenceData(
                    data_type=data_type,
                    data_key=key,
                    data_value=value,
                    data_description=item.get("description", None),
                    data_extra=item,
                    is_active=True
                )
                db.add(db_data)
                created_count += 1
        
        db.commit()
        return {"message": f"成功導入 {created_count} 筆 {data_type} 參考資料"}
    
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="無效的JSON格式")
    except Exception as e:
        logger.error(f"導入參考資料失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"導入參考資料失敗: {str(e)}")


@router.get("/search/{data_type}", response_model=List[Dict[str, Any]])
def search_reference_data(
    data_type: str, 
    q: str = Query(..., description="搜尋關鍵字"),
    limit: int = Query(10, description="返回結果數量限制"),
    db: Session = Depends(get_db)
):
    """模糊搜尋特定類型的參考資料"""
    data = db.query(ReferenceData).filter(
        ReferenceData.data_type == data_type,
        ReferenceData.is_active == True,
        (
            ReferenceData.data_key.ilike(f"%{q}%") | 
            ReferenceData.data_value.ilike(f"%{q}%")
        )
    ).limit(limit).all()
    
    result = []
    for item in data:
        result.append({
            "key": item.data_key,
            "value": item.data_value,
            "description": item.data_description,
            "extra": item.data_extra
        })
    
    return result 