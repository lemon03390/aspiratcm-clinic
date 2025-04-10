import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from typing import Dict
from app.api import appointments_router, doctors_router, patient_registration_router
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
    """創建和配置 FastAPI 應用"""
    app = FastAPI(
        title="診所預約系統 API",
        description="用於管理診所預約和醫生的 API",
        version="1.0.0"
    )

    # ✅ CORS 設定
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ✅ 路由註冊
    app.include_router(appointments_router, prefix="/api/v1/appointments", tags=["appointments"])
    app.include_router(doctors_router, prefix="/api/v1/doctors", tags=["doctors"])
    app.include_router(appointment_detail_router, prefix="/api/v1/appointments", tags=["appointment-detail"])
    app.include_router(patient_registration_router, prefix="/api/v1/patient_registration", tags=["patient-registration"])

    @app.get("/")
    async def root() -> Dict[str, str]:
        return {"message": "歡迎使用診所預約系統 API"}

    @app.get("/api/v1/health")
    async def health_check() -> Dict[str, str]:
        return {
            "status": "healthy",
            "version": "1.0.0",
            "service": "clinic-api"
        }

    @app.get("/debug/timezone")
    def debug_timezone():
        return {"hk_time": now_hk().isoformat()}

    return app

# ✅ 給 Uvicorn 載入 app 使用
app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, proxy_headers=True)
