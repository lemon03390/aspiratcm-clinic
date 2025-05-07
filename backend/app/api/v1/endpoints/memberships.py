import csv
from datetime import datetime
from io import StringIO
from typing import Any, List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps
from app.core.settings import settings

router = APIRouter()


def parse_boolean(value: str) -> bool:
    """將字符串轉換為布爾值"""
    if not value or value.lower() in {"null", "none", ""}:
        return False
    return value.lower() in {"1", "true", "yes", "是", "t", "y"}


@router.get("/", response_model=schemas.membership.MembershipList)
def read_memberships(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    search: str = None,
) -> Any:
    """
    讀取會員列表。
    """
    return crud.membership.get_multi_with_filter(db, skip=skip, limit=limit, search=search)


@router.post("/", response_model=schemas.membership.Membership)
def create_membership(
    *,
    db: Session = Depends(deps.get_db),
    membership_in: schemas.membership.MembershipCreate,
) -> Any:
    """
    建立新會員。
    """
    if membership_in.hkid and crud.membership.get_by_hkid(db, hkid=membership_in.hkid):
        raise HTTPException(
            status_code=400,
            detail="已存在相同身分證號碼的會員",
        )
    return crud.membership.create(db, obj_in=membership_in)


@router.post("/import", response_model=schemas.membership.MembershipImportResponse)
async def import_memberships(
    *,
    db: Session = Depends(deps.get_db),
    file: UploadFile = File(...),
) -> Any:
    """
    批量導入會員資料 (CSV)
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="只接受CSV檔案")

    # 讀取CSV檔案內容
    content = await file.read()

    try:
        csv_text = content.decode('utf-8-sig')
    except UnicodeDecodeError as e:
        try:
            csv_text = content.decode('big5')  # 嘗試使用big5編碼
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="無法解析CSV檔案編碼") from e

    csv_file = StringIO(csv_text)

    try:
        reader = csv.DictReader(csv_file)
        imported = []
        skipped = []
        errors = []
        row_count = 0

        for row in reader:
            row_count += 1
            try:
                # 檢查必要欄位
                if not row.get("patientName"):
                    errors.append(f"第 {row_count} 行: 缺少姓名欄位")
                    continue

                # 檢查此會員是否已存在（使用身分證號碼）
                hkid = row.get("hkid")
                if hkid:
                    if existing_member := crud.membership.get_by_hkid(db, hkid=hkid):
                        skipped.append(hkid)
                        continue

                # 解析patient_id
                patient_id = None
                if row.get("patient_id"):
                    try:
                        patient_id = int(row.get("patient_id"))
                    except ValueError:
                        errors.append(f"第 {row_count} 行: 無法解析patient_id")
                        continue

                # 創建會員模型
                membership_data = schemas.membership.MembershipCreate(
                    patient_id=patient_id,
                    phoneNumber=row.get("phoneNumber"),
                    contactAddress=row.get("contactAddress"),
                    patientName=row.get("patientName", ""),
                    hkid=hkid,
                    termsConsent=parse_boolean(row.get("termsConsent", "")),
                    haveCard=parse_boolean(row.get("haveCard", "")),
                )

                # 保存到資料庫
                membership = crud.membership.create(db, obj_in=membership_data)
                imported.append(membership)

            except Exception as e:
                errors.append(f"第 {row_count} 行: {str(e)}")

        return {
            "imported": len(imported),
            "skipped": len(skipped),
            "errors": len(errors),
            "error_details": errors[:20] if errors else []  # 限制錯誤詳情數量
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"處理CSV檔案時發生錯誤: {str(e)}") from e


@router.get("/{id}", response_model=schemas.membership.Membership)
def read_membership(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
) -> Any:
    """
    通過ID獲取會員。
    """
    if not (membership := crud.membership.get(db, id=id)):
        raise HTTPException(status_code=404, detail="會員不存在")
    return membership


@router.put("/{id}", response_model=schemas.membership.Membership)
def update_membership(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    membership_in: schemas.membership.MembershipUpdate,
) -> Any:
    """
    更新會員資料。
    """
    if not (membership := crud.membership.get(db, id=id)):
        raise HTTPException(status_code=404, detail="會員不存在")
    
    # 檢查身分證號碼是否變更且新的號碼已存在
    if membership_in.hkid and membership_in.hkid != membership.hkid:
        if existing_member := crud.membership.get_by_hkid(db, hkid=membership_in.hkid):
            if existing_member.id != id:
                raise HTTPException(
                    status_code=400,
                    detail="已存在相同身分證號碼的會員",
                )
    
    return crud.membership.update(db, db_obj=membership, obj_in=membership_in)


@router.delete("/{id}", response_model=schemas.membership.Membership)
def delete_membership(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
) -> Any:
    """
    刪除會員。
    """
    if not (membership := crud.membership.get(db, id=id)):
        raise HTTPException(status_code=404, detail="會員不存在")
    return crud.membership.remove(db, id=id) 