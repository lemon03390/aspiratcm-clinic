from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from app.models.member_plan import MemberPlan
from app.schemas.member_plan import MemberPlanCreate, MemberPlanUpdate


def get_member_plan(db: Session, member_plan_id: int) -> Optional[MemberPlan]:
    """獲取單個增值計劃"""
    return db.query(MemberPlan).filter(MemberPlan.id == member_plan_id).first()


def get_member_plan_by_name(db: Session, name: str) -> Optional[MemberPlan]:
    """通過名稱獲取增值計劃"""
    return db.query(MemberPlan).filter(MemberPlan.name == name).first()


def get_member_plans(
    db: Session, 
    *, 
    skip: int = 0, 
    limit: int = 100,
    is_active: Optional[bool] = None
) -> List[MemberPlan]:
    """獲取增值計劃列表"""
    query = db.query(MemberPlan)
    
    if is_active is not None:
        query = query.filter(MemberPlan.is_active == is_active)
    
    # 按排序順序和名稱排序
    query = query.order_by(asc(MemberPlan.sort_order), asc(MemberPlan.name))
    
    return query.offset(skip).limit(limit).all()


def count_member_plans(
    db: Session, 
    *, 
    is_active: Optional[bool] = None
) -> int:
    """計算增值計劃數量"""
    query = db.query(MemberPlan)
    
    if is_active is not None:
        query = query.filter(MemberPlan.is_active == is_active)
    
    return query.count()


def create_member_plan(db: Session, *, obj_in: MemberPlanCreate) -> MemberPlan:
    """創建新的增值計劃"""
    db_obj = MemberPlan(
        name=obj_in.name,
        description=obj_in.description,
        base_amount=obj_in.base_amount,
        bonus_amount=obj_in.bonus_amount,
        is_active=obj_in.is_active,
        sort_order=obj_in.sort_order
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_member_plan(
    db: Session, 
    *, 
    db_obj: MemberPlan,
    obj_in: MemberPlanUpdate
) -> MemberPlan:
    """更新增值計劃"""
    update_data = obj_in.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_member_plan(db: Session, *, id: int) -> MemberPlan:
    """刪除增值計劃"""
    obj = db.query(MemberPlan).get(id)
    db.delete(obj)
    db.commit()
    return obj 