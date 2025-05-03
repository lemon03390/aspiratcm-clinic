import json
import os
import logging
from sqlalchemy.orm import Session
from app.models.medical_record import ReferenceData
from app.db.session import db_session

logger = logging.getLogger(__name__)

def load_reference_data_from_file(file_path: str, data_type: str, db: Session):
    """從JSON檔案加載參考資料到資料庫"""
    try:
        if not os.path.exists(file_path):
            logger.error(f"檔案不存在: {file_path}")
            return False, f"檔案不存在: {file_path}"
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not isinstance(data, list):
            logger.error(f"無效的資料格式，預期為陣列: {file_path}")
            return False, f"無效的資料格式，預期為陣列: {file_path}"
        
        created_count = 0
        
        for item in data:
            if isinstance(item, str):
                # 若為純字串列表，字串即為value
                existing = db.query(ReferenceData).filter(
                    ReferenceData.data_type == data_type,
                    ReferenceData.data_key == item
                ).first()
                
                if not existing:
                    db_data = ReferenceData(
                        data_type=data_type,
                        data_key=item,
                        data_value=item,
                        is_active=True
                    )
                    db.add(db_data)
                    created_count += 1
            elif isinstance(item, dict):
                # 若為物件列表，需處理key-value結構
                key = item.get("key", item.get("name", ""))
                value = item.get("value", item.get("label", key))
                
                if not key:
                    continue
                
                existing = db.query(ReferenceData).filter(
                    ReferenceData.data_type == data_type,
                    ReferenceData.data_key == key
                ).first()
                
                if not existing:
                    db_data = ReferenceData(
                        data_type=data_type,
                        data_key=key,
                        data_value=value,
                        data_description=item.get("description", None),
                        data_extra=item,
                        is_active=True
                    )
                    db.add(db_data)
                    created_count += 1
        
        db.commit()
        return True, f"成功導入 {created_count} 筆 {data_type} 參考資料"
    
    except json.JSONDecodeError as e:
        logger.error(f"JSON格式錯誤: {file_path} - {str(e)}")
        return False, f"JSON格式錯誤: {file_path} - {str(e)}"
    except Exception as e:
        logger.error(f"導入參考資料失敗: {file_path} - {str(e)}")
        db.rollback()
        return False, f"導入參考資料失敗: {str(e)}"


def init_reference_data():
    """初始化所有參考資料"""
    data_sets = [
        {"file": "acupoint_reference.json", "type": "acupoints"},
        {"file": "modern_disease_list.json", "type": "modern_diseases"},
        {"file": "cm_syndrome_list.json", "type": "cm_syndromes"},
        {"file": "cm_principle_list.json", "type": "cm_principles"},
        {"file": "pulse_reference.json", "type": "pulse_qualities"},
        {"file": "tongue_reference.json", "type": "tongue_qualities"},
        {"file": "bone_adjustment_list.json", "type": "bone_adjustments"},
    ]
    
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../data")
    results = []
    
    with db_session() as db:
        for data_set in data_sets:
            file_path = os.path.join(data_dir, data_set["file"])
            success, message = load_reference_data_from_file(file_path, data_set["type"], db)
            results.append({"type": data_set["type"], "success": success, "message": message})
    
    return results


def load_json_data(file_path: str):
    """加載JSON檔案為Python物件"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"加載JSON檔案失敗: {file_path} - {str(e)}")
        return None


if __name__ == "__main__":
    # 當直接執行此檔案時，初始化參考資料
    logging.basicConfig(level=logging.INFO)
    results = init_reference_data()
    for result in results:
        if result["success"]:
            logger.info(result["message"])
        else:
            logger.error(result["message"]) 