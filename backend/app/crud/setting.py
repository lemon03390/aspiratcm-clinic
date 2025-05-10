from typing import Any, Dict, List, Optional, Union

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.crud.base import CRUDBase
from app.models.setting import MemberTopUpPlan
from app.schemas.setting import MemberTopUpPlanCreate, MemberTopUpPlanUpdate


class CRUDMemberTopUpPlan(CRUDBase[MemberTopUpPlan, MemberTopUpPlanCreate, MemberTopUpPlanUpdate]):
    def get_active_plans(self, db: Session, *, skip: int = 0, limit: int = 100) -> Dict[str, Any]:
        """獲取所有啟用的增值計劃"""
        query = db.query(self.model).filter(self.model.is_active == True)

        return self._extracted_from_get_all_plans_5(query, skip, limit)
    
    def get_all_plans(self, db: Session, *, skip: int = 0, limit: int = 100) -> Dict[str, Any]:
        """獲取所有增值計劃（含未啟用）"""
        query = db.query(self.model)

        return self._extracted_from_get_all_plans_5(query, skip, limit)

    # TODO Rename this here and in `get_active_plans` and `get_all_plans`
    def _extracted_from_get_all_plans_5(self, query, skip, limit):
        total = query.count()
        items = (
            query.order_by(self.model.display_order.asc(), self.model.id.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return {"items": items, "total": total}


member_topup_plan = CRUDMemberTopUpPlan(MemberTopUpPlan) 