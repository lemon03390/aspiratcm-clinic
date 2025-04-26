from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session
import logging

from app.db.session import get_db
from app.models.setting import TcmSetting
from app.schemas.setting import (
    TcmSettingCreate, 
    TcmSettingUpdate, 
    TcmSettingInDB,
    TcmSettingFull,
    CategoryEnum
)

router = APIRouter()
logger = logging.getLogger(__name__)

VALID_CATEGORIES = [
    CategoryEnum.MODERN_DISEASE,
    CategoryEnum.CM_SYNDROME,
    CategoryEnum.TCM_TREATMENT_RULE,
    CategoryEnum.TCM_TREATMENT_METHOD,
    CategoryEnum.TCM_SINGLE_HERB
]

# 依類別獲取所有設定
@router.get("/{category}", response_model=List[TcmSettingInDB])
async def get_settings_by_category(
    category: str = Path(..., description="設定類別"),
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="搜尋關鍵字")
):
    """獲取指定類別的所有設定"""
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"無效的類別: {category}")
    
    query = db.query(TcmSetting).filter(TcmSetting.category == category)
    
    # 使用命名表達式簡化搜尋條件
    if search:
        query = query.filter(TcmSetting.name.ilike(f"%{search}%"))
    
    return query.all()

# 獲取單個設定
@router.get("/{category}/{id}", response_model=TcmSettingInDB)
async def get_setting(
    id: int = Path(..., description="設定ID"),
    category: str = Path(..., description="設定類別"),
    db: Session = Depends(get_db)
):
    """獲取單個設定詳情"""
    if not (setting := db.query(TcmSetting).filter(
        TcmSetting.id == id,
        TcmSetting.category == category
    ).first()):
        raise HTTPException(status_code=404, detail=f"找不到ID為 {id} 的設定")
    
    return setting

# 建立設定
@router.post("/{category}", response_model=TcmSettingInDB)
async def create_setting(
    category: str = Path(..., description="設定類別"),
    setting: TcmSettingCreate = None,
    db: Session = Depends(get_db)
):
    """創建新設定"""
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"無效的類別: {category}")
    
    # 確保類別一致
    if setting.category != category:
        setting.category = category
    
    # 創建新的設定記錄
    db_setting = TcmSetting(
        category=setting.category,
        name=setting.name,
        aliases=setting.aliases,
        parent_id=setting.parent_id
    )
    
    # 自動生成代碼（基於類別前綴和ID）
    db.add(db_setting)
    db.commit()
    db.refresh(db_setting)
    
    # 更新代碼
    prefix_map = {
        CategoryEnum.MODERN_DISEASE: "MD",
        CategoryEnum.CM_SYNDROME: "SYN",
        CategoryEnum.TCM_TREATMENT_RULE: "TR",
        CategoryEnum.TCM_TREATMENT_METHOD: "TM",
        CategoryEnum.TCM_SINGLE_HERB: "HERB"
    }
    prefix = prefix_map.get(category, "TC")
    db_setting.code = f"{prefix}{db_setting.id:04d}"
    
    db.commit()
    db.refresh(db_setting)
    
    return db_setting

# 更新設定
@router.put("/{category}/{id}", response_model=TcmSettingInDB)
async def update_setting(
    id: int = Path(..., description="設定ID"),
    category: str = Path(..., description="設定類別"),
    setting: TcmSettingUpdate = None,
    db: Session = Depends(get_db)
):
    """更新設定"""
    if not (db_setting := db.query(TcmSetting).filter(
        TcmSetting.id == id,
        TcmSetting.category == category
    ).first()):
        raise HTTPException(status_code=404, detail=f"找不到ID為 {id} 的設定")
    
    # 更新可修改的欄位
    if setting.name:
        db_setting.name = setting.name
    if setting.aliases is not None:
        db_setting.aliases = setting.aliases
    if setting.parent_id is not None:
        db_setting.parent_id = setting.parent_id
    
    db.commit()
    db.refresh(db_setting)
    
    return db_setting

# 刪除設定
@router.delete("/{category}/{id}", response_model=dict)
async def delete_setting(
    id: int = Path(..., description="設定ID"),
    category: str = Path(..., description="設定類別"),
    db: Session = Depends(get_db)
):
    """刪除設定"""
    if not (db_setting := db.query(TcmSetting).filter(
        TcmSetting.id == id,
        TcmSetting.category == category
    ).first()):
        raise HTTPException(status_code=404, detail=f"找不到ID為 {id} 的設定")
    
    # 檢查是否有子項
    children_count = db.query(TcmSetting).filter(TcmSetting.parent_id == id).count()
    if children_count > 0:
        raise HTTPException(status_code=400, detail=f"無法刪除：此設定有 {children_count} 個子項")
    
    db.delete(db_setting)
    db.commit()
    
    return {"success": True, "message": f"成功刪除 ID {id} 的設定"}

# 批量導入設定
@router.post("/{category}/batch", response_model=dict)
async def batch_import_settings(
    category: str = Path(..., description="設定類別"),
    items: List[TcmSettingCreate] = None,
    db: Session = Depends(get_db)
):
    """批量導入設定"""
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"無效的類別: {category}")
    
    try:
        added_count = 0
        for item in items:
            # 確保類別一致
            item.category = category
            
            # 檢查是否已存在
            existing = db.query(TcmSetting).filter(
                TcmSetting.category == category,
                TcmSetting.name == item.name
            ).first()
            
            if not existing:
                # 創建新記錄
                db_setting = TcmSetting(
                    category=item.category,
                    name=item.name,
                    aliases=item.aliases,
                    parent_id=item.parent_id
                )
                db.add(db_setting)
                added_count += 1
        
        db.commit()
        
        # 更新所有新添加記錄的代碼
        prefix_map = {
            CategoryEnum.MODERN_DISEASE: "MD",
            CategoryEnum.CM_SYNDROME: "SYN",
            CategoryEnum.TCM_TREATMENT_RULE: "TR",
            CategoryEnum.TCM_TREATMENT_METHOD: "TM",
            CategoryEnum.TCM_SINGLE_HERB: "HERB"
        }
        prefix = prefix_map.get(category, "TC")
        
        # 獲取所有沒有代碼的記錄
        settings_without_code = db.query(TcmSetting).filter(
            TcmSetting.category == category,
            TcmSetting.code.is_(None)
        ).all()
        
        for setting in settings_without_code:
            setting.code = f"{prefix}{setting.id:04d}"
        
        db.commit()
        
        return {
            "success": True, 
            "message": f"已成功導入 {added_count} 個設定項", 
            "count": added_count
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"批量導入設定失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"批量導入失敗: {str(e)}") from e 