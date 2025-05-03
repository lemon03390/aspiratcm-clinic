#!/usr/bin/env python3
import os
from pathlib import Path
import sys
import logging

# 獲取當前腳本的目錄
current_dir = Path(__file__).parent.absolute()
# 添加到 Python 路徑
sys.path.append(str(Path(current_dir).parent))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def start_server():
    """啟動 FastAPI 伺服器"""
    from app.main import app
    import uvicorn
    
    logger.info("正在啟動後端服務...")
    logger.info("啟動 API 伺服器在 http://0.0.0.0:8000")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    start_server() 