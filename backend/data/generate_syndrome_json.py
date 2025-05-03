import json
import os
from typing import List, Dict, Any, Set

# 定義工作目錄
DATA_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DATA_DIR = os.path.abspath(os.path.join(DATA_DIR, '../../frontend/public/data'))

def load_json_file(filename: str) -> Any:
    """載入JSON檔案"""
    file_path = os.path.join(DATA_DIR, filename)
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json_file(data: Any, filename: str, frontend: bool = True) -> None:
    """儲存JSON檔案到後端和前端（如果需要）"""
    # 儲存到後端目錄
    backend_path = os.path.join(DATA_DIR, filename)
    with open(backend_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    # 如果需要，也儲存到前端目錄
    if frontend:
        os.makedirs(FRONTEND_DATA_DIR, exist_ok=True)
        frontend_path = os.path.join(FRONTEND_DATA_DIR, filename)
        with open(frontend_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"已儲存 {filename}")

def save_jsonl_file(data: List[Dict], filename: str) -> None:
    """儲存JSONL檔案（只儲存到後端）"""
    file_path = os.path.join(DATA_DIR, filename)
    with open(file_path, 'w', encoding='utf-8') as f:
        for item in data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
    print(f"已儲存 {filename}")

def main():
    """主程序：生成各種JSON檔案"""
    print("開始生成證候相關JSON檔案...")
    
    # 載入原始資料
    tcm_data = load_json_file('tcm_codes_fung_version_full.json')
    
    # 1. 生成 cm_syndrime_alias_to_name.json
    print("生成 cm_syndrime_alias_to_name.json...")
    alias_to_name = {}
    for item in tcm_data:
        name = item.get("name", "")
        aliases = item.get("aliases", [])
        for alias in aliases:
            alias_to_name[alias] = name
    save_json_file(alias_to_name, "cm_syndrime_alias_to_name.json")
    
    # 2. 生成 cm_syndrime_parent_to_children.json
    print("生成 cm_syndrime_parent_to_children.json...")
    parent_to_children = {}
    for item in tcm_data:
        code = item.get("code", "")
        parent = item.get("parent", "")
        if parent and parent != "null":
            if parent not in parent_to_children:
                parent_to_children[parent] = []
            parent_to_children[parent].append(code)
    save_json_file(parent_to_children, "cm_syndrime_parent_to_children.json")
    
    # 3. 生成 cm_syndrime_autocomplete_list.json
    print("生成 cm_syndrime_autocomplete_list.json...")
    autocomplete_list = []
    for item in tcm_data:
        name = item.get("name", "")
        if name:
            autocomplete_list.append(name)
        aliases = item.get("aliases", [])
        autocomplete_list.extend(aliases)
    save_json_file(sorted(set(autocomplete_list)), "cm_syndrime_autocomplete_list.json")
    
    # 4. 生成 cm_syndrime_syndrome_code_mapping.json
    print("生成 cm_syndrime_syndrome_code_mapping.json...")
    syndrome_code_mapping = {}

    # 創建一個集合來跟踪已經處理過的症候名稱
    processed_syndrome_names = set()

    # 排除的症狀類別名稱
    duplicate_syndrome_names = [
        "氣症類", "血症類", "陰症類", "瘀血症類", "精症類", "髓症類", "津液症類",
        "陽症類", "寒症類", "熱症類", "濕症類", "燥症類", "風症類", "痰症類",
        "肝症類", "心症類", "脾症類", "肺症類", "腎症類", "脈症類", "膽症類",
        "胃症類", "小腸症類", "大腸症類", "膀胱症類", "三焦症類", "經症類", "帶症類",
        "雜症類", "外感症類", "內傷症類", "婦科症類", "兒科症類", "皮膚科症類"
    ]
    # 排除的症狀類別映射（子類別代碼前綴）
    excluded_codes = [
        "B03.01.", "B03.02.", "B03.03.", "B03.04.", "B03.05.", "B03.06.", "B03.07.",
        "B03.08.", "B01.01.", "B01.02.", "B01.03.", "B01.04.", "B01.05.", "B01.06.", 
        "B02.01.", "B02.02.", "B02.03.", "B02.04.", "B02.05.", "B02.06.", "B02.07.",
        "B02.08.", "B02.09.", "B02.10.", "B02.11.", "B02.12.", "B04.01.", "B04.02.",
        "B05.01.", "B05.02.", "B05.03.", "B05.04.", "B05.05."
    ]

    for item in tcm_data:
        code = item.get("code", "")
        name = item.get("name", "")
        
        if code and name:
            # 如果是已知重複的症候名稱，並且代碼在排除列表中，則跳過
            if name in duplicate_syndrome_names and code in excluded_codes:
                print(f"排除重複症候: {name} ({code})")
                continue
            
            # 檢查這個症候名稱是否已經被處理過
            if name in processed_syndrome_names:
                # 如果已存在，檢查現有映射的代碼
                existing_code = syndrome_code_mapping.get(name)
                
                # 選擇保留代碼長度較短的（層級較淺的）
                if existing_code and len(existing_code) <= len(code):
                    print(f"保留現有映射: {name} => {existing_code}，排除 {code}")
                    continue
                else:
                    print(f"替換映射: {name} => {existing_code} 為 {code}")
            
            # 將症候名稱添加到已處理集合
            processed_syndrome_names.add(name)
            syndrome_code_mapping[name] = code

    # 輸出處理結果
    print(f"總共生成 {len(syndrome_code_mapping)} 個症候映射")
    print(f"已排除 {len(duplicate_syndrome_names)} 個重複症候類別")
    save_json_file(syndrome_code_mapping, "cm_syndrime_syndrome_code_mapping.json")
    
    # 建立代碼到標準名稱的映射
    code_to_name = {}
    for item in tcm_data:
        code = item.get("code", "")
        name = item.get("name", "")
        if code:
            code_to_name[code] = name
    
    # 建立父級關係映射
    parent_mapping = {}
    for item in tcm_data:
        code = item.get("code", "")
        parent = item.get("parent", "")
        if parent and parent != "null":
            parent_mapping[code] = parent
    
    # 建立代碼到路徑的映射
    code_paths = {}
    
    def build_path(code: str) -> List[str]:
        """根據代碼構建完整路徑"""
        if code in code_paths:
            return code_paths[code]
        
        path = []
        current_code = code
        visited = set()  # 防止循環依賴
        
        # 從當前節點往上遍歷到根節點
        while current_code and current_code not in visited:
            visited.add(current_code)
            name = code_to_name.get(current_code, current_code)
            path.insert(0, name)  # 將名稱插入到路徑開頭
            
            # 獲取父級代碼
            current_code = parent_mapping.get(current_code)
            if current_code == "null":
                break
        
        code_paths[code] = path
        return path
    
    # 5. 生成 knowledge_base.jsonl
    print("生成 knowledge_base.jsonl...")
    knowledge_base = []
    
    for item in tcm_data:
        code = item.get("code", "")
        name = item.get("name", "")
        aliases = item.get("aliases", [])
        
        # 獲取完整路徑
        try:
            full_path = build_path(code)
        except Exception as e:
            print(f"處理代碼 {code} 時出錯: {str(e)}")
            full_path = [name]
        
        # 建立知識條目
        entry = {
            "code": code,
            "name": name,
            "aliases": aliases,
            "full_path": full_path
        }
        knowledge_base.append(entry)
    
    save_jsonl_file(knowledge_base, "knowledge_base.jsonl")
    
    # 6. 生成 query_preprocess_mapping.json
    print("生成 query_preprocess_mapping.json...")
    query_mapping = {}
    
    # 從現有的 alias_to_name 建立映射
    for alias, std_name in alias_to_name.items():
        query_mapping[alias] = std_name
    
    # 添加標準名稱到自身的映射
    for item in tcm_data:
        name = item.get("name", "")
        if name:
            # 確保標準名稱也可以被正確轉換
            query_mapping[name] = name
            
            # 處理不帶"症"字的輸入
            if name.endswith("症"):
                name_without_suffix = name[:-1]
                query_mapping[name_without_suffix] = name
    
    save_json_file(query_mapping, "query_preprocess_mapping.json", frontend=False)
    
    # 7. 生成 validation_name_list.json
    print("生成 validation_name_list.json...")
    validation_names = []
    
    # 將所有標準名稱添加到驗證列表
    for item in tcm_data:
        name = item.get("name", "")
        if name and name not in validation_names:
            validation_names.append(name)
    
    save_json_file(validation_names, "validation_name_list.json", frontend=False)
    
    print("所有檔案生成完成!")

if __name__ == "__main__":
    main() 