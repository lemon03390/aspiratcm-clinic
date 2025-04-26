import json
import os
from typing import List, Dict, Optional, Any

# 獲取當前目錄路徑，確保可以正確載入 JSON 檔案
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")

# 載入證候數據
def load_syndrome_data():
    """載入所有證候相關的 JSON 數據"""
    data = {
        "code_to_name": {},
        "name_to_code": {},
        "alias_to_name": {},
        "parent_to_children": {}
    }
    
    try:
        # 載入代碼映射
        with open(os.path.join(DATA_DIR, "cm_syndrime_syndrome_code_mapping.json"), "r", encoding="utf-8") as f:
            data["name_to_code"] = json.load(f)
            # 創建反向映射
            for name, code in data["name_to_code"].items():
                if code not in data["code_to_name"] or len(name) < len(data["code_to_name"][code]):
                    data["code_to_name"][code] = name
        
        # 載入別名映射
        with open(os.path.join(DATA_DIR, "cm_syndrime_alias_to_name.json"), "r", encoding="utf-8") as f:
            data["alias_to_name"] = json.load(f)
        
        # 載入父子關係
        with open(os.path.join(DATA_DIR, "cm_syndrime_parent_to_children.json"), "r", encoding="utf-8") as f:
            data["parent_to_children"] = json.load(f)
            
    except Exception as e:
        print(f"載入證候數據時出錯: {str(e)}")
    
    return data

# 全局緩存
_SYNDROME_DATA = None

def get_syndrome_data():
    """獲取證候數據，使用緩存提高效能"""
    global _SYNDROME_DATA
    if _SYNDROME_DATA is None:
        _SYNDROME_DATA = load_syndrome_data()
    return _SYNDROME_DATA

def get_syndrome_name(code: str) -> str:
    """根據證候代碼獲取標準名稱"""
    data = get_syndrome_data()
    return data["code_to_name"].get(code, code)

def get_syndrome_aliases(name: str) -> List[str]:
    """根據標準名稱獲取所有別名"""
    data = get_syndrome_data()
    return [alias for alias, std_name in data["alias_to_name"].items() if std_name == name]

def get_syndrome_info(code: str) -> Dict[str, Any]:
    """獲取完整的證候信息，包括代碼、標準名稱和別名"""
    data = get_syndrome_data()
    name = get_syndrome_name(code)
    aliases = get_syndrome_aliases(name)
    
    return {
        "code": code,
        "name": name,
        "aliases": aliases
    }

def enrich_syndromes(syndrome_codes: List[str]) -> List[Dict[str, Any]]:
    """將證候代碼列表轉換為包含詳細信息的對象列表"""
    if not syndrome_codes:
        return []
    
    return [get_syndrome_info(code) for code in syndrome_codes] 