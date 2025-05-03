#!/usr/bin/env python
import json
import os
from typing import Dict, List, Any, Set

# 定義常量和路徑
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')

# 確保輸出目錄存在
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 定義輸入文件路徑
TCM_CODES_FILE = os.path.join(DATA_DIR, 'tcm_codes_fung_version_full.json')
MODERN_DISEASE_FILE = os.path.join(DATA_DIR, 'modern_chinese_disease_name.json')
TCM_TREATMENT_RULE_FILE = os.path.join(DATA_DIR, 'tcm_treatment_rule.json')

# 定義輸出文件路徑
TCM_SYNDROME_TREE_FILE = os.path.join(OUTPUT_DIR, 'cm_syndrome_tree.json')
MODERN_DISEASE_TREE_FILE = os.path.join(OUTPUT_DIR, 'modern_disease_tree.json')
TCM_TREATMENT_TREE_FILE = os.path.join(OUTPUT_DIR, 'cm_treatment_rule_tree.json')

def load_json_file(file_path: str) -> List[Dict[str, Any]]:
    """載入 JSON 檔案"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"錯誤：無法載入檔案 {file_path}: {e}")
        return []

def save_json_file(data: List[Dict[str, Any]], file_path: str):
    """儲存 JSON 檔案"""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"檔案已儲存至 {file_path}")
    except Exception as e:
        print(f"錯誤：無法儲存檔案 {file_path}: {e}")

def create_tree_structure(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """創建樹狀結構"""
    # 建立 code 到 node 的映射，以便快速查找
    code_to_node = {}
    result = []

    # 第一次遍歷：創建所有節點
    for item in data:
        code = item.get('code', '')
        name = item.get('name', '')
        aliases = item.get('aliases', [])
        parent_code = item.get('parent', None)

        # 創建節點
        node = {
            'label': name,
            'value': code,
            'aliases': aliases,
            'children': []
        }

        # 加入 code_to_node 字典，以便後續查找
        code_to_node[code] = node

        # 如果沒有父節點，則加入到結果中
        if parent_code is None:
            result.append(node)

    # 第二次遍歷：構建樹狀結構
    for item in data:
        code = item.get('code', '')
        parent_code = item.get('parent', None)

        # 如果有父節點，將當前節點加入到父節點的子節點列表中
        if parent_code is not None and parent_code in code_to_node:
            parent_node = code_to_node[parent_code]
            current_node = code_to_node[code]
            parent_node['children'].append(current_node)

    # 標記葉節點
    mark_leaf_nodes(result)
    
    return result

def mark_leaf_nodes(nodes: List[Dict[str, Any]]):
    """標記葉節點"""
    for node in nodes:
        if 'children' in node:
            if len(node['children']) == 0:
                node['isLeaf'] = True
                # 可以刪除空的 children 屬性以減少檔案大小
                del node['children']
            else:
                node['isLeaf'] = False
                mark_leaf_nodes(node['children'])

def create_autocomplete_list(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """創建自動完成列表"""
    autocomplete_list = []
    process_items_for_autocomplete(data, autocomplete_list)
    return autocomplete_list

def process_items_for_autocomplete(items: List[Dict[str, Any]], result: List[Dict[str, Any]]):
    """處理項目以生成自動完成列表"""
    for item in items:
        # 添加主要名稱
        result.append({
            'label': item['label'],
            'value': item['value']
        })
        
        # 添加別名 - 使用 extend 替代循環 append
        result.extend([
            {'label': alias, 'value': item['value']}
            for alias in item.get('aliases', [])
        ])
        
        # 遞迴處理子項目
        if 'children' in item and not item.get('isLeaf', False):
            process_items_for_autocomplete(item['children'], result)

def process_data_category(source_file: str, tree_output_file: str, autocomplete_output_name: str):
    """處理一個類別的參考數據，生成樹狀結構和自動完成列表
    
    Args:
        source_file: 源數據文件路徑
        tree_output_file: 輸出樹狀結構文件路徑
        autocomplete_output_name: 輸出自動完成列表文件名
    """
    # 加載數據
    data = load_json_file(source_file)
    
    # 創建樹狀結構
    tree_data = create_tree_structure(data)
    save_json_file(tree_data, tree_output_file)
    
    # 創建自動完成列表
    autocomplete_list = create_autocomplete_list(tree_data)
    save_json_file(autocomplete_list, os.path.join(OUTPUT_DIR, autocomplete_output_name))

def process_all_reference_data():
    """處理所有參考數據"""
    # 1. 處理中醫證候數據
    process_data_category(
        TCM_CODES_FILE, 
        TCM_SYNDROME_TREE_FILE, 
        'cm_syndrome_autocomplete.json'
    )
    
    # 2. 處理現代病名數據
    process_data_category(
        MODERN_DISEASE_FILE, 
        MODERN_DISEASE_TREE_FILE, 
        'modern_disease_autocomplete.json'
    )
    
    # 3. 處理中醫治則數據
    process_data_category(
        TCM_TREATMENT_RULE_FILE, 
        TCM_TREATMENT_TREE_FILE, 
        'cm_treatment_rule_autocomplete.json'
    )

if __name__ == "__main__":
    process_all_reference_data()
    print("完成所有參考數據處理") 