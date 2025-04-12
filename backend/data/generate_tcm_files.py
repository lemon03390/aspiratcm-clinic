#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import os

# 獲取當前目錄路徑
current_dir = os.path.dirname(os.path.abspath(__file__))

# 讀取原始檔案
input_file = os.path.join(current_dir, 'tcm_codes_fung_version_full.json')
with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 1. 創建 cm_syndrime_alias_to_name.json
alias_to_name = {}
for item in data:
    name = item['name']
    aliases = item.get('aliases', [])
    for alias in aliases:
        alias_to_name[alias] = name

output_file = os.path.join(current_dir, 'cm_syndrime_alias_to_name.json')
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(alias_to_name, f, ensure_ascii=False, indent=2)
    
# 2. 創建 cm_syndrime_parent_to_children.json
parent_to_children = {}
for item in data:
    code = item['code']
    parent = item.get('parent', None)
    if parent and parent != 'null':
        if parent not in parent_to_children:
            parent_to_children[parent] = []
        parent_to_children[parent].append(code)

output_file = os.path.join(current_dir, 'cm_syndrime_parent_to_children.json')
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(parent_to_children, f, ensure_ascii=False, indent=2)

# 3. 創建 cm_syndrime_autocomplete_list.json
autocomplete_list = []
for item in data:
    name = item['name']
    aliases = item.get('aliases', [])
    if name not in autocomplete_list:
        autocomplete_list.append(name)
    for alias in aliases:
        if alias not in autocomplete_list:
            autocomplete_list.append(alias)

output_file = os.path.join(current_dir, 'cm_syndrime_autocomplete_list.json')
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(autocomplete_list, f, ensure_ascii=False, indent=2)

# 4. 創建 cm_syndrime_syndrome_code_mapping.json
name_to_code = {}
for item in data:
    code = item['code']
    name = item['name']
    aliases = item.get('aliases', [])
    name_to_code[name] = code
    for alias in aliases:
        name_to_code[alias] = code

output_file = os.path.join(current_dir, 'cm_syndrime_syndrome_code_mapping.json')
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(name_to_code, f, ensure_ascii=False, indent=2)

print('已完成所有檔案生成。') 