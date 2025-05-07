from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class MembershipBase(BaseModel):
    patient_id: Optional[int] = None
    phoneNumber: Optional[str] = None
    contactAddress: Optional[str] = None
    patientName: str
    hkid: Optional[str] = None
    termsConsent: bool = False
    haveCard: bool = False


class MembershipCreate(MembershipBase):
    pass


class MembershipUpdate(BaseModel):
    patient_id: Optional[int] = None
    phoneNumber: Optional[str] = None
    contactAddress: Optional[str] = None
    patientName: Optional[str] = None
    hkid: Optional[str] = None
    termsConsent: Optional[bool] = None
    haveCard: Optional[bool] = None


class MembershipInDBBase(MembershipBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Membership(MembershipInDBBase):
    pass


class MembershipList(BaseModel):
    items: List[Membership]
    total: int


class MembershipImportResponse(BaseModel):
    imported: int
    skipped: int
    errors: int
    error_details: List[str] 