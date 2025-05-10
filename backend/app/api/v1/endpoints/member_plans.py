from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import schemas, crud
from app.db.database import get_db

router = APIRouter()


@router.get("/", response_model=schemas.MemberPlanList)
async def read_member_plans(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None
) -> Any:
    """
    獲取增值計劃列表。
    """
    member_plans = crud.member_plan.get_member_plans(db, skip=skip, limit=limit, is_active=is_active)
    total = crud.member_plan.count_member_plans(db, is_active=is_active)
    return {"items": member_plans, "total": total}


@router.post("/", response_model=schemas.MemberPlan)
async def create_member_plan(
    *,
    db: Session = Depends(get_db),
    member_plan_in: schemas.MemberPlanCreate
) -> Any:
    """
    創建新的增值計劃。
    """
    if existing_plan := crud.member_plan.get_member_plan_by_name(
        db, name=member_plan_in.name
    ):
        raise HTTPException(
            status_code=400,
            detail=f"增值計劃名稱 '{member_plan_in.name}' 已存在"
        )

    member_plan = crud.member_plan.create_member_plan(db, obj_in=member_plan_in)
    return member_plan


@router.get("/{member_plan_id}", response_model=schemas.MemberPlan)
async def read_member_plan(
    *,
    db: Session = Depends(get_db),
    member_plan_id: int
) -> Any:
    """
    獲取指定的增值計劃。
    """
    if member_plan := crud.member_plan.get_member_plan(
        db, member_plan_id=member_plan_id
    ):
        return member_plan
    else:
        raise HTTPException(
            status_code=404,
            detail=f"增值計劃 ID {member_plan_id} 不存在"
        )


@router.put("/{member_plan_id}", response_model=schemas.MemberPlan)
async def update_member_plan(
    *,
    db: Session = Depends(get_db),
    member_plan_id: int,
    member_plan_in: schemas.MemberPlanUpdate
) -> Any:
    """
    更新指定的增值計劃。
    """
    member_plan = crud.member_plan.get_member_plan(db, member_plan_id=member_plan_id)
    if not member_plan:
        raise HTTPException(
            status_code=404,
            detail=f"增值計劃 ID {member_plan_id} 不存在"
        )

    # 如果更新了名稱，檢查名稱是否已存在
    if member_plan_in.name and member_plan_in.name != member_plan.name:
        if existing_plan := crud.member_plan.get_member_plan_by_name(
            db, name=member_plan_in.name
        ):
            raise HTTPException(
                status_code=400,
                detail=f"增值計劃名稱 '{member_plan_in.name}' 已存在"
            )

    member_plan = crud.member_plan.update_member_plan(db, db_obj=member_plan, obj_in=member_plan_in)
    return member_plan


@router.delete("/{member_plan_id}", response_model=schemas.MemberPlan)
async def delete_member_plan(
    *,
    db: Session = Depends(get_db),
    member_plan_id: int
) -> Any:
    """
    刪除指定的增值計劃。
    """
    member_plan = crud.member_plan.get_member_plan(db, member_plan_id=member_plan_id)
    if not member_plan:
        raise HTTPException(
            status_code=404,
            detail=f"增值計劃 ID {member_plan_id} 不存在"
        )
    
    member_plan = crud.member_plan.delete_member_plan(db, id=member_plan_id)
    return member_plan 