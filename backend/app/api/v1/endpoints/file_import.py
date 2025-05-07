import csv
import os
import sys
import tempfile
import traceback
from io import StringIO
from typing import Any, List, Dict, Tuple

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api import deps
from app.core.settings import settings
from app.models.membership import Membership
from app.utils.csv_importer import save_upload_file_temp

router = APIRouter()

def parse_boolean(value: str) -> bool:
    """將字符串轉換為布爾值"""
    if not value or value.lower() in {"null", "none", ""}:
        return False
    return value.lower() in {"1", "true", "yes", "是", "t", "y"}


def decode_csv_content(content: bytes) -> str:
    """嘗試用不同編碼解析CSV內容"""
    try:
        return content.decode('utf-8-sig')
    except UnicodeDecodeError:
        try:
            return content.decode('big5')
        except UnicodeDecodeError as e:
            raise HTTPException(status_code=400, detail="無法解析CSV檔案的編碼") from e


def validate_csv_headers(reader: csv.DictReader) -> Dict:
    """驗證CSV首行並返回第一行數據"""
    try:
        first_line = next(reader)
        print(f"CSV首行欄位: {list(first_line.keys())}")
        return first_line
    except StopIteration as exc:
        raise HTTPException(status_code=400, detail="CSV檔案為空或格式不正確") from exc


def process_membership_row(db: Session, row: Dict, row_count: int) -> Tuple[Membership, str, str]:
    """處理單行會員數據，返回會員對象或錯誤信息"""
    if not row.get("patientName"):
        return None, None, f"第 {row_count} 行: 缺少patientName欄位"

    # 檢查此會員是否已存在（使用身分證號碼）
    hkid = row.get("hkid")
    if hkid:
        if (
            existing := db.query(Membership)
            .filter(Membership.hkid == hkid)
            .first()
        ):
            print(f"跳過已存在會員: {hkid}")
            return None, hkid, None

    # 解析patient_id
    patient_id = None
    if row.get("patient_id"):
        try:
            patient_id = int(row.get("patient_id"))
        except ValueError:
            return None, None, f"第 {row_count} 行: 無法解析patient_id"

    # 建立新會員
    print(f"正在創建會員: {row.get('patientName')}")
    membership = Membership(
        patient_id=patient_id,
        phoneNumber=row.get("phoneNumber"),
        contactAddress=row.get("contactAddress"),
        patientName=row.get("patientName"),
        hkid=hkid,
        termsConsent=parse_boolean(row.get("termsConsent")),
        haveCard=parse_boolean(row.get("haveCard")),
    )

    return membership, None, None


@router.post("/membership/import")
async def import_membership_csv(
    *,
    db: Session = Depends(deps.get_db),
    file: UploadFile = File(...),
) -> Any:
    """導入會員CSV檔案"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="只接受CSV檔案")

    print(f"開始處理檔案: {file.filename}")
    print(f"資料庫連接字符串: {settings.DATABASE_URL}")

    imported = []
    skipped = []
    errors = []
    
    try:
        # 讀取並解碼CSV內容
        content = await file.read()
        csv_text = decode_csv_content(content)
        
        # 解析CSV
        csv_file = StringIO(csv_text)
        reader = csv.DictReader(csv_file)
        
        # 驗證CSV頭部
        first_line = validate_csv_headers(reader)
        csv_file.seek(0)  # 重置到開頭，以便後面重新讀取
        reader = csv.DictReader(csv_file)
        
        # 處理每一行
        for row_count, row in enumerate(reader, 1):
            try:
                membership, skipped_id, error = process_membership_row(db, row, row_count)
                
                if error:
                    errors.append(error)
                elif skipped_id:
                    skipped.append(skipped_id)
                elif membership:
                    db.add(membership)
                    imported.append(membership)
            except Exception as e:
                print(f"處理第 {row_count} 行時發生錯誤: {str(e)}")
                errors.append(f"第 {row_count} 行處理錯誤: {str(e)}")
        
        print(f"提交前已添加 {len(imported)} 筆資料")
        db.commit()
        print(f"成功提交 {len(imported)} 筆資料到資料庫")
        
        return JSONResponse(
            content={
                "imported": len(imported),
                "skipped": len(skipped),
                "errors": len(errors),
                "error_details": errors[:20] if errors else [],
                "message": f"成功導入 {len(imported)} 筆會員資料"
            },
            status_code=200
        )
    except Exception as e:
        db.rollback()
        tb = traceback.format_exc()
        print(f"導入過程中發生錯誤: {str(e)}\n{tb}")
        return JSONResponse(
            content={"detail": f"導入處理時發生錯誤: {str(e)}", "traceback": tb},
            status_code=500
        ) 