from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import json
import os
from fastapi.responses import JSONResponse

from app.database import get_db
from app.models.medical_record import ReferenceData
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()

# 定義數據目錄
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'data')

# 定義數據文件路徑
CM_SYNDROME_TREE_FILE = os.path.join(DATA_DIR, 'cm_syndrome_tree.json')
MODERN_DISEASE_TREE_FILE = os.path.join(DATA_DIR, 'modern_disease_tree.json')
CM_TREATMENT_RULE_TREE_FILE = os.path.join(DATA_DIR, 'cm_treatment_rule_tree.json')
CM_SYNDROME_AUTOCOMPLETE_FILE = os.path.join(DATA_DIR, 'cm_syndrome_autocomplete.json')
MODERN_DISEASE_AUTOCOMPLETE_FILE = os.path.join(DATA_DIR, 'modern_disease_autocomplete.json')
CM_TREATMENT_RULE_AUTOCOMPLETE_FILE = os.path.join(DATA_DIR, 'cm_treatment_rule_autocomplete.json')
TCM_CODES_FILE = os.path.join(DATA_DIR, 'tcm_codes_fung_version_full.json')
MODERN_DISEASE_FILE = os.path.join(DATA_DIR, 'modern_chinese_disease_name.json')
TCM_TREATMENT_RULE_FILE = os.path.join(DATA_DIR, 'tcm_treatment_rule.json')
TONGUE_REFERENCE_FILE = os.path.join(DATA_DIR, 'tongue_reference.json')
PULSE_REFERENCE_FILE = os.path.join(DATA_DIR, 'pulse_reference.json')

def load_json_file(file_path: str) -> Any:
    """載入 JSON 檔案"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"找不到檔案: {file_path}") from e
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"JSON 解析錯誤: {file_path}") from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"載入檔案時發生錯誤: {str(e)}") from e


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
    if data := db.query(ReferenceData).filter(
        ReferenceData.data_type == data_type,
        ReferenceData.is_active == True
    ).all():
        return data
    
    raise HTTPException(status_code=404, detail=f"未找到類型 {data_type} 的參考資料")


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
        if not (data_list := json.loads(json_data)):
            raise HTTPException(status_code=400, detail="JSON資料為空")
            
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
                if not (key := item.get("key", item.get("name", ""))):
                    continue
                
                value = item.get("value", item.get("label", key))
                
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
    
    except json.JSONDecodeError as decode_error:
        raise HTTPException(status_code=400, detail="無效的JSON格式") from decode_error
    except Exception as e:
        logger.error(f"導入參考資料失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"導入參考資料失敗: {str(e)}") from e


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
    
    return [
        {
            "key": item.data_key,
            "value": item.data_value,
            "description": item.data_description,
            "extra": item.data_extra
        }
        for item in data
    ]


@router.get("/cm-syndromes")
async def get_cm_syndromes():
    """獲取所有中醫證候"""
    try:
        return {"data": load_json_file(TCM_CODES_FILE), "total": len(load_json_file(TCM_CODES_FILE))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@router.get("/modern-diseases")
async def get_modern_diseases():
    """獲取所有現代病名"""
    try:
        return {"data": load_json_file(MODERN_DISEASE_FILE), "total": len(load_json_file(MODERN_DISEASE_FILE))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@router.get("/tcm-principles")
async def get_tcm_principles():
    """獲取所有中醫治則"""
    try:
        return {"data": load_json_file(TCM_TREATMENT_RULE_FILE), "total": len(load_json_file(TCM_TREATMENT_RULE_FILE))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@router.get("/cm-syndrome-tree")
async def get_cm_syndrome_tree():
    """獲取中醫證候樹狀數據"""
    try:
        return load_json_file(CM_SYNDROME_TREE_FILE)
    except Exception as e:
        # 如果樹狀數據文件不存在，嘗試從原始 JSON 載入並響應錯誤
        try:
            return JSONResponse(
                status_code=500,
                content={"detail": f"樹狀數據文件不存在，請先運行轉換腳本: {str(e)}"}
            )
        except Exception as inner_e:
            raise HTTPException(status_code=500, detail=f"獲取中醫證候數據失敗: {str(inner_e)}") from inner_e

@router.get("/modern-disease-tree")
async def get_modern_disease_tree():
    """獲取現代病名樹狀數據"""
    try:
        return load_json_file(MODERN_DISEASE_TREE_FILE)
    except Exception as e:
        # 如果樹狀數據文件不存在，嘗試從原始 JSON 載入並響應錯誤
        try:
            return JSONResponse(
                status_code=500,
                content={"detail": f"樹狀數據文件不存在，請先運行轉換腳本: {str(e)}"}
            )
        except Exception as inner_e:
            raise HTTPException(status_code=500, detail=f"獲取現代病名數據失敗: {str(inner_e)}") from inner_e

@router.get("/cm-treatment-rule-tree")
async def get_cm_treatment_rule_tree():
    """獲取中醫治則樹狀數據"""
    try:
        return load_json_file(CM_TREATMENT_RULE_TREE_FILE)
    except Exception as e:
        # 如果樹狀數據文件不存在，嘗試從原始 JSON 載入並響應錯誤
        try:
            return JSONResponse(
                status_code=500,
                content={"detail": f"樹狀數據文件不存在，請先運行轉換腳本: {str(e)}"}
            )
        except Exception as inner_e:
            raise HTTPException(status_code=500, detail=f"獲取中醫治則數據失敗: {str(inner_e)}") from inner_e

@router.get("/cm-syndrome-autocomplete")
async def get_cm_syndrome_autocomplete():
    """獲取中醫證候自動完成數據"""
    try:
        return load_json_file(CM_SYNDROME_AUTOCOMPLETE_FILE)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取中醫證候自動完成數據失敗: {str(e)}") from e

@router.get("/modern-disease-autocomplete")
async def get_modern_disease_autocomplete():
    """獲取現代病名自動完成數據"""
    try:
        return load_json_file(MODERN_DISEASE_AUTOCOMPLETE_FILE)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取現代病名自動完成數據失敗: {str(e)}") from e

@router.get("/cm-treatment-rule-autocomplete")
async def get_cm_treatment_rule_autocomplete():
    """獲取中醫治則自動完成數據"""
    try:
        return load_json_file(CM_TREATMENT_RULE_AUTOCOMPLETE_FILE)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取中醫治則自動完成數據失敗: {str(e)}") from e

def process_search_results(all_data, search_term):
    """處理搜尋結果的通用函數"""
    results = []
    q_lower = search_term.lower()
    
    for item in all_data:
        if name := item.get('name', ''):
            code = item.get('code', '')
            
            # 檢查名稱是否包含搜尋詞
            if q_lower in name.lower():
                results.append({'code': code, 'name': name})
                continue
                
            # 檢查別名是否包含搜尋詞
            for alias in item.get('aliases', []):
                if q_lower in alias.lower():
                    results.append({'code': code, 'name': name})
                    break
    
    return results

@router.get("/search/cm-syndromes")
async def search_cm_syndromes(q: str = Query(..., min_length=1)):
    """搜尋中醫證候"""
    try:
        return {"data": process_search_results(load_json_file(TCM_CODES_FILE), q), 
                "total": len(process_search_results(load_json_file(TCM_CODES_FILE), q))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@router.get("/search/modern-diseases")
async def search_modern_diseases(q: str = Query(..., min_length=1)):
    """搜尋現代病名"""
    try:
        return {"data": process_search_results(load_json_file(MODERN_DISEASE_FILE), q), 
                "total": len(process_search_results(load_json_file(MODERN_DISEASE_FILE), q))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@router.get("/search/tcm-principles")
async def search_tcm_principles(q: str = Query(..., min_length=1)):
    """搜尋中醫治則"""
    try:
        return {"data": process_search_results(load_json_file(TCM_TREATMENT_RULE_FILE), q), 
                "total": len(process_search_results(load_json_file(TCM_TREATMENT_RULE_FILE), q))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@router.get("/tongue-reference")
async def get_tongue_reference():
    """獲取舌診參考資料"""
    try:
        return load_json_file(TONGUE_REFERENCE_FILE)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取舌診參考資料失敗: {str(e)}") from e


@router.get("/pulse-reference")
async def get_pulse_reference():
    """獲取脈診參考資料"""
    try:
        return load_json_file(PULSE_REFERENCE_FILE)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取脈診參考資料失敗: {str(e)}") from e 