from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api import deps
from app.models.tag_type import TagType
from app.schemas.tag_type import TagType as TagTypeSchema, TagTypeCreate, TagTypeUpdate

router = APIRouter()


@router.get("", response_model=List[TagTypeSchema])
def get_tags(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db)
):
    """獲取所有標籤"""
    return db.query(TagType).offset(skip).limit(limit).all()


@router.post("", response_model=TagTypeSchema, status_code=status.HTTP_201_CREATED)
def create_tag(
    tag: TagTypeCreate,
    db: Session = Depends(deps.get_db)
):
    """建立新標籤"""
    if (
        existing_tag := db.query(TagType)
        .filter(TagType.name == tag.name)
        .first()
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"標籤名稱 '{tag.name}' 已存在"
        )

    # 建立新標籤
    db_tag = TagType(**tag.dict())
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag


@router.get("/{tag_id}", response_model=TagTypeSchema)
def get_tag(
    tag_id: int,
    db: Session = Depends(deps.get_db)
):
    """獲取指定標籤"""
    db_tag = db.query(TagType).filter(TagType.id == tag_id).first()
    if db_tag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"找不到 ID 為 {tag_id} 的標籤"
        )
    return db_tag


@router.put("/{tag_id}", response_model=TagTypeSchema)
def update_tag(
    tag_id: int,
    tag: TagTypeUpdate,
    db: Session = Depends(deps.get_db)
):
    """更新標籤"""
    db_tag = db.query(TagType).filter(TagType.id == tag_id).first()
    if db_tag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"找不到 ID 為 {tag_id} 的標籤"
        )

    # 如果要更新名稱，檢查名稱是否與其他標籤重複
    if tag.name and tag.name != db_tag.name:
        if (
            existing_tag := db.query(TagType)
            .filter(TagType.name == tag.name, TagType.id != tag_id)
            .first()
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"標籤名稱 '{tag.name}' 已存在"
            )

    # 更新標籤屬性
    tag_data = tag.dict(exclude_unset=True)
    for key, value in tag_data.items():
        setattr(db_tag, key, value)

    db.commit()
    db.refresh(db_tag)
    return db_tag


@router.delete("/{tag_id}", response_model=TagTypeSchema)
def delete_tag(
    tag_id: int,
    db: Session = Depends(deps.get_db)
):
    """刪除標籤"""
    db_tag = db.query(TagType).filter(TagType.id == tag_id).first()
    if db_tag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"找不到 ID 為 {tag_id} 的標籤"
        )
    
    db.delete(db_tag)
    db.commit()
    return db_tag 