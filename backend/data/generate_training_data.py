#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import os
import sys
from typing import Dict, List, Any

# 提高遞迴深度上限
sys.setrecursionlimit(10000)

# 獲取當前目錄路徑
current_dir = os.path.dirname(os.path.abspath(__file__))

# 讀取原始檔案
def load_json_file(filename: str) -> Any:
    """載入 JSON 檔案"""
    filepath = os.path.join(current_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

# 儲存 JSON 檔案
def save_json_file(data: Any, filename: str) -> None:
    """保存 JSON 檔案"""
    filepath = os.path.join(current_dir, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"已儲存 {filename}")

# 儲存 JSONL 檔案
def save_jsonl_file(data: List[Dict], filename: str) -> None:
    """保存 JSONL 檔案"""
    filepath = os.path.join(current_dir, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        for item in data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
    print(f"已儲存 {filename}，共 {len(data)} 筆資料")

# 載入原始資料
print("載入原始資料...")
tcm_data = load_json_file('tcm_codes_fung_version_full.json')
parent_to_children = load_json_file('cm_syndrime_parent_to_children.json')
alias_to_name = load_json_file('cm_syndrime_alias_to_name.json')
syndrome_code_mapping = load_json_file('cm_syndrime_syndrome_code_mapping.json')

# 建立代碼到標準名稱的映射
print("建立代碼名稱映射...")
code_to_name = {}
code_to_item = {}

# 一次性將所有項目映射好
for item in tcm_data:
    code = item.get("code", "")
    name = item.get("name", "")
    if code:
        code_to_name[code] = name
        code_to_item[code] = item

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

# 1. 生成 knowledge_base.jsonl
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

# 2. 生成 query_preprocess_mapping.json
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

# 3. 生成 validation_name_list.json
print("生成 validation_name_list.json...")
validation_names = []

# 將所有標準名稱添加到驗證列表
for item in tcm_data:
    name = item.get("name", "")
    if name and name not in validation_names:
        validation_names.append(name)

# 將三個檔案保存到硬碟
save_jsonl_file(knowledge_base, 'knowledge_base.jsonl')
save_json_file(query_mapping, 'query_preprocess_mapping.json')
save_json_file(validation_names, 'validation_name_list.json')

print("資料生成完成!") 