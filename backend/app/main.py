import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from typing import Dict
from app.api import appointments_router, doctors_router
from app.api.appointment_detail import router as appointment_detail_router
from app.core.config import ALLOWED_ORIGINS
from app.utils.time import now_hk

# 設置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

def create_app() -> FastAPI:
    """創建和配置FastAPI應用程序"""
    try:
        logger.info("創建FastAPI應用程序...")
        
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

        # 註冊預約路由
        app.include_router(
            appointments_router,
            prefix="/api/v1/appointments",
            tags=["appointments"]
        )

        app.include_router(
            doctors_router,
            prefix="/api/v1/doctors",
            tags=["doctors"]
        )
        
        # 註冊單個預約操作的路由
        app.include_router(
            appointment_detail_router,
            prefix="/api/v1/appointments",
            tags=["appointment-detail"]
        )

        @app.get("/")
        async def root() -> Dict[str, str]:
            """API根路徑處理程序，返回歡迎訊息"""
            return {"message": "歡迎使用診所預約系統 API"}

        @app.get("/api/v1/health")
        async def health_check() -> Dict[str, str]:
            """健康檢查端點，用於監控系統運行狀態"""
            return {
                "status": "healthy",
                "version": "1.0.0",
                "service": "clinic-api"
            }

        # 時區調試端點
        @app.get("/debug/timezone")
        def debug_timezone():
            """返回當前香港時間，用於調試時區問題"""
            return {"hk_time": now_hk().isoformat()}

        return app
    except Exception as e:
        logger.error(f"創建應用程序時發生錯誤: {e}")
        return None

app = create_app()

if __name__ == "__main__" and (app := create_app()):
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
