from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os
import logging
from typing import Dict, List, Any

# 設置日誌
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

# 將項目根目錄添加到 Python 路徑
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)  # 設置為 backend 目錄
sys.path.append(project_root)

# 允許的跨域來源列表
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://localhost:3002", 
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:3005",
    "http://localhost:3006",
    "http://localhost:3007",
    "http://localhost:3008",
    "http://localhost:3009",
    "*"  # 允許所有來源，用於測試階段
]

def create_app() -> FastAPI:
    """創建和配置FastAPI應用程序"""
    try:
        # 導入路由
        from routes import appointments, doctors
        logger.info("成功導入路由")
        
        app = FastAPI(
            title="診所預約系統 API",
            description="用於管理診所預約和醫生的API",
            version="1.0.0"
        )

        # 配置 CORS
        app.add_middleware(
            CORSMiddleware,
            allow_origins=ALLOWED_ORIGINS,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        # 註冊路由
        app.include_router(
            appointments.router,
            prefix="/api/v1/appointments",
            tags=["appointments"]
        )

        app.include_router(
            doctors.router,
            prefix="/api/v1/doctors",
            tags=["doctors"]
        )

        @app.get("/")
        async def root() -> Dict[str, str]:
            """API根路徑處理程序，返回歡迎訊息"""
            return {"message": "歡迎使用診所預約系統 API"}

        @app.get("/health")
        async def health_check() -> Dict[str, str]:
            """健康檢查端點，用於監控系統運行狀態"""
            return {"status": "healthy"}

        return app
    except Exception as e:
        logger.error(f"創建應用程序時發生錯誤: {e}")
        return None

if __name__ == "__main__" and (app := create_app()):
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 