#!/usr/bin/env python3
import os
from pathlib import Path

# 獲取當前腳本的目錄
current_dir = Path(__file__).parent.absolute()

if __name__ == "__main__":
    print("正在啟動後端服務...")
    print("啟動 API 伺服器在 http://0.0.0.0:8000")
    
    # 使用 python 命令運行 app.main 模塊
    os.system(f"cd {current_dir} && {current_dir}/.venv/bin/python3 -m app.main") 