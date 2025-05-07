from fastapi import APIRouter, HTTPException, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from app.db.session import get_db
import logging
import json
from contextlib import contextmanager

# 設置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

router = APIRouter()

# 創建數據庫事務上下文管理器
@contextmanager
def db_transaction(db: Session):
    """數據庫事務上下文管理器，處理提交和回滾"""
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        raise e

class TagType(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    color: str
    icon: Optional[str] = None
    is_active: bool = True

class TagTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: str  # 格式如 "blue", "red", "yellow" 等
    icon: Optional[str] = None

class TagTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("")
async def get_all_tags(request: Request, db: Session = Depends(get_db)):
    """獲取所有標籤類型"""
    try:
        logger.info(f"獲取標籤資料請求: {request.url}")
        logger.info(f"請求頭: {request.headers}")
        
        # 查詢所有標籤
        query = text("""
        SELECT id, name, description, color, icon, is_active, created_at, updated_at
        FROM tag_types
        ORDER BY id
        """)
        
        logger.info("執行SQL查詢: SELECT * FROM tag_types")
        result = db.execute(query).fetchall()
        logger.info(f"查詢結果行數: {len(result)}")
        
        # 將查詢結果轉換為字典列表
        tags = []
        tags.extend(
            {
                "id": tag[0],
                "name": tag[1],
                "description": tag[2],
                "color": tag[3],
                "icon": tag[4],
                "is_active": tag[5],
                "created_at": tag[6].isoformat() if tag[6] else None,
                "updated_at": tag[7].isoformat() if tag[7] else None,
            }
            for tag in result
        )
        
        logger.info(f"返回標籤數據: {tags}")
        return tags
    except Exception as e:
        logger.error(f"獲取標籤時出錯: {str(e)}")
        logger.exception("標籤查詢失敗的完整異常堆疊:")
        raise HTTPException(status_code=500, detail=f"獲取標籤時出錯: {str(e)}") from e

@router.post("")
async def create_tag(request: Request, tag: TagTypeCreate, db: Session = Depends(get_db)):
    """創建新標籤"""
    try:
        with db_transaction(db):
            now = datetime.now()

            # 檢查名稱是否已存在
            check_sql = text("SELECT id FROM tag_types WHERE name = :name")
            if existing := db.execute(
                check_sql, {"name": tag.name}
            ).fetchone():
                raise HTTPException(status_code=400, detail=f"標籤名稱 '{tag.name}' 已存在")

            # 插入新標籤
            insert_sql = text("""
            INSERT INTO tag_types (name, description, color, icon, is_active, created_at, updated_at)
            VALUES (:name, :description, :color, :icon, :is_active, :created_at, :updated_at)
            RETURNING id
            """)

            params = {
                "name": tag.name,
                "description": tag.description,
                "color": tag.color,
                "icon": tag.icon,
                "is_active": True,
                "created_at": now,
                "updated_at": now
            }

            result = db.execute(insert_sql, params).fetchone()
            tag_id = result[0]

            # 構造返回數據
            return {
                "id": tag_id,
                "name": tag.name,
                "description": tag.description,
                "color": tag.color,
                "icon": tag.icon,
                "is_active": True,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"創建標籤時出錯: {str(e)}")
        raise HTTPException(status_code=500, detail=f"創建標籤時出錯: {str(e)}") from e

@router.put("/{tag_id}")
async def update_tag(request: Request, tag_id: int, tag_update: TagTypeUpdate, db: Session = Depends(get_db)):
    """更新標籤"""
    try:
        with db_transaction(db):
            # 檢查標籤是否存在
            check_sql = text("SELECT id FROM tag_types WHERE id = :id")
            existing = db.execute(check_sql, {"id": tag_id}).fetchone()

            if not existing:
                raise HTTPException(status_code=404, detail=f"未找到 ID 為 {tag_id} 的標籤")

            # 構建更新語句
            update_fields = []
            params = {"id": tag_id}

            if tag_update.name is not None:
                # 檢查名稱是否已被其他標籤使用
                name_check = text("SELECT id FROM tag_types WHERE name = :name AND id != :id")
                if name_exists := db.execute(
                    name_check, {"name": tag_update.name, "id": tag_id}
                ).fetchone():
                    raise HTTPException(status_code=400, detail=f"標籤名稱 '{tag_update.name}' 已被使用")

                update_fields.append("name = :name")
                params["name"] = tag_update.name

            if tag_update.description is not None:
                update_fields.append("description = :description")
                params["description"] = tag_update.description

            if tag_update.color is not None:
                update_fields.append("color = :color")
                params["color"] = tag_update.color

            if tag_update.icon is not None:
                update_fields.append("icon = :icon")
                params["icon"] = tag_update.icon

            if tag_update.is_active is not None:
                update_fields.append("is_active = :is_active")
                params["is_active"] = tag_update.is_active

            # 如果沒有提供更新欄位，直接返回成功
            if not update_fields:
                # 獲取當前標籤數據
                get_sql = text("""
                SELECT id, name, description, color, icon, is_active, created_at, updated_at
                FROM tag_types WHERE id = :id
                """)
                result = db.execute(get_sql, {"id": tag_id}).fetchone()

                return {
                    "id": result[0],
                    "name": result[1],
                    "description": result[2],
                    "color": result[3],
                    "icon": result[4],
                    "is_active": result[5],
                    "created_at": result[6].isoformat() if result[6] else None,
                    "updated_at": result[7].isoformat() if result[7] else None
                }

            # 添加更新時間
            update_fields.append("updated_at = :updated_at")
            params["updated_at"] = datetime.now()

            # 執行更新
            update_sql = text(f"""
            UPDATE tag_types
            SET {", ".join(update_fields)}
            WHERE id = :id
            """)

            db.execute(update_sql, params)

            # 獲取更新後的標籤數據
            get_sql = text("""
            SELECT id, name, description, color, icon, is_active, created_at, updated_at
            FROM tag_types WHERE id = :id
            """)
            result = db.execute(get_sql, {"id": tag_id}).fetchone()

            return {
                "id": result[0],
                "name": result[1],
                "description": result[2],
                "color": result[3],
                "icon": result[4],
                "is_active": result[5],
                "created_at": result[6].isoformat() if result[6] else None,
                "updated_at": result[7].isoformat() if result[7] else None
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新標籤時出錯: {str(e)}")
        raise HTTPException(status_code=500, detail=f"更新標籤時出錯: {str(e)}") from e

@router.delete("/{tag_id}")
async def delete_tag(request: Request, tag_id: int, db: Session = Depends(get_db)):
    """刪除標籤"""
    try:
        with db_transaction(db):
            # 檢查標籤是否存在
            check_sql = text("SELECT name FROM tag_types WHERE id = :id")
            existing = db.execute(check_sql, {"id": tag_id}).fetchone()
            
            if not existing:
                raise HTTPException(status_code=404, detail=f"未找到 ID 為 {tag_id} 的標籤")
            
            tag_name = existing[0]
            
            # 刪除標籤
            delete_sql = text("DELETE FROM tag_types WHERE id = :id")
            db.execute(delete_sql, {"id": tag_id})
            
            return {"message": f"成功刪除標籤 '{tag_name}'", "id": tag_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"刪除標籤時出錯: {str(e)}")
        raise HTTPException(status_code=500, detail=f"刪除標籤時出錯: {str(e)}") from e 