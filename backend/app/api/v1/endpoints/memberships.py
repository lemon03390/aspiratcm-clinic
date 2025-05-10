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
    
    # 創建會員
    membership = crud.membership.create(db, obj_in=membership_in)
    
    # 創建會員帳戶餘額記錄
    crud.membership_account_balance.create_or_update(
        db, 
        membership_id=membership.id, 
        stored_value=0, 
        gifted_value=0
    )
    
    # 創建啟用記錄
    crud.membership_account_log.create_log(
        db, 
        membership_id=membership.id, 
        amount=0, 
        gift_amount=0, 
        type_="Start", 
        description="會員開通"
    )
    
    return membership


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
                
                # 創建會員帳戶餘額記錄
                crud.membership_account_balance.create_or_update(
                    db,
                    membership_id=membership.id,
                    stored_value=0,
                    gifted_value=0
                )
                
                # 創建啟用記錄
                crud.membership_account_log.create_log(
                    db,
                    membership_id=membership.id,
                    amount=0,
                    gift_amount=0,
                    type_="Start",
                    description="會員開通"
                )

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


# ----- 會員帳戶餘額相關端點 -----

@router.get("/{id}/balance", response_model=schemas.membership_account.MembershipAccountBalance)
def read_membership_balance(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
) -> Any:
    """
    獲取會員帳戶餘額。
    """
    if not crud.membership.get(db, id=id):
        raise HTTPException(status_code=404, detail="會員不存在")

    return crud.membership_account_balance.get_by_membership_id(
        db, membership_id=id
    ) or crud.membership_account_balance.create_or_update(
        db, membership_id=id, stored_value=0, gifted_value=0
    )


@router.post("/{id}/balance/topup", response_model=schemas.membership_account.MembershipAccountBalance)
def topup_membership_balance(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    topup: schemas.membership_account.MembershipTopUp,
) -> Any:
    """
    會員增值。可選擇增值計劃或自訂金額。
    """
    if not crud.membership.get(db, id=id):
        raise HTTPException(status_code=404, detail="會員不存在")

    stored_value = topup.amount
    gifted_value = topup.gift_amount

    # 如果指定了增值計劃ID
    if topup.plan_id:
        try:
            # 使用新的增值計劃模型
            plan = crud.member_plan.get_member_plan(db, member_plan_id=topup.plan_id)
            if not plan or not plan.is_active:
                raise HTTPException(status_code=400, detail="無效的增值計劃")

            # 使用新的字段名稱
            stored_value = plan.base_amount
            gifted_value = plan.bonus_amount
            log_type = f"TopUp{plan.id}"
        except Exception as e:
            # 記錄錯誤並返回更詳細的信息
            import traceback
            error_detail = str(e) + "\n" + traceback.format_exc()
            raise HTTPException(status_code=500, detail=f"獲取增值計劃失敗: {error_detail}") from e
    else:
        # 自訂增值
        log_type = "TopUp"

    # 增加會員餘額
    balance = crud.membership_account_balance.add_value(
        db,
        membership_id=id,
        stored_value=stored_value,
        gifted_value=gifted_value
    )

    # 創建交易記錄
    crud.membership_account_log.create_log(
        db,
        membership_id=id,
        amount=stored_value,
        gift_amount=gifted_value,
        type_=log_type,
        description=str(stored_value + gifted_value)  # 總增值金額作為描述
    )

    return balance


@router.post("/{id}/balance/spend", response_model=schemas.membership_account.MembershipAccountBalance)
def spend_membership_balance(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    spend: schemas.membership_account.MembershipSpend,
) -> Any:
    """
    會員消費扣減。
    """
    if not crud.membership.get(db, id=id):
        raise HTTPException(status_code=404, detail="會員不存在")

    try:
        # 扣減會員餘額
        result = crud.membership_account_balance.deduct_value(
            db,
            membership_id=id,
            total_amount=spend.amount
        )

        # 創建交易記錄
        crud.membership_account_log.create_log(
            db,
            membership_id=id,
            amount=result["deduct_detail"]["deduct_stored"],
            gift_amount=result["deduct_detail"]["deduct_gifted"],
            type_="Spend",
            description=str(spend.amount)  # 消費總額作為描述
        )

        return result["balance"]

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/{id}/logs", response_model=schemas.membership_account.MembershipAccountLogList)
def read_membership_logs(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    獲取會員帳戶交易記錄。
    """
    if not crud.membership.get(db, id=id):
        raise HTTPException(status_code=404, detail="會員不存在")
    
    return crud.membership_account_log.get_logs_by_membership_id(
        db, 
        membership_id=id, 
        skip=skip, 
        limit=limit
    )


# ----- 會員搜尋端點 -----

@router.get("/search/by-phone", response_model=schemas.membership.Membership)
def search_membership_by_phone(
    *,
    db: Session = Depends(deps.get_db),
    phone: str,
) -> Any:
    """
    通過電話號碼搜尋會員。
    """
    query = db.query(crud.membership.model).filter(crud.membership.model.phoneNumber == phone)
    if membership := query.first():
        return membership
    else:
        raise HTTPException(status_code=404, detail="找不到符合此電話號碼的會員")


@router.get("/search/by-hkid", response_model=schemas.membership.Membership)
def search_membership_by_hkid(
    *,
    db: Session = Depends(deps.get_db),
    hkid: str,
) -> Any:
    """
    通過身份證號碼搜尋會員。
    """
    if membership := crud.membership.get_by_hkid(db, hkid=hkid):
        return membership
    else:
        raise HTTPException(status_code=404, detail="找不到符合此身份證號碼的會員")


@router.get("/search/by-patient-id", response_model=schemas.membership.Membership)
def search_membership_by_patient_id(
    *,
    db: Session = Depends(deps.get_db),
    patient_id: int,
) -> Any:
    """
    通過病人ID搜尋會員。
    """
    if membership := crud.membership.get_by_patient_id(
        db, patient_id=patient_id
    ):
        return membership
    else:
        raise HTTPException(status_code=404, detail="找不到符合此病人ID的會員") 