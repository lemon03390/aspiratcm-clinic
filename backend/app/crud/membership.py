from typing import Any, Dict, List, Optional, Union

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.membership import Membership
from app.schemas.membership import MembershipCreate, MembershipUpdate


class CRUDMembership(CRUDBase[Membership, MembershipCreate, MembershipUpdate]):
    def get_by_hkid(self, db: Session, *, hkid: str) -> Optional[Membership]:
        return db.query(Membership).filter(Membership.hkid == hkid).first()
    
    def get_by_patient_id(self, db: Session, *, patient_id: int) -> Optional[Membership]:
        return db.query(Membership).filter(Membership.patient_id == patient_id).first()

    def get_multi_with_filter(
        self, db: Session, *, skip: int = 0, limit: int = 100, search: Optional[str] = None
    ) -> Dict[str, Any]:
        query = db.query(self.model)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (self.model.patientName.ilike(search_term)) | 
                (self.model.phoneNumber.ilike(search_term))
            )
        
        total = query.count()
        items = query.order_by(self.model.id.desc()).offset(skip).limit(limit).all()
        
        return {"items": items, "total": total}


membership = CRUDMembership(Membership) 