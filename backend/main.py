from fastapi import FastAPI
from app.api.doctors import router as doctors_router
from app.api.appointments import router as appointments_router
from app.api.settings import router as settings_router # type: ignore
from app.api.tag_settings import router as tag_settings_router

app = FastAPI(title="中醫診所管理系統 API", version="1.0")

app.include_router(appointments_router, prefix="/api/v1/appointments", tags=["appointments"])
app.include_router(doctors_router, prefix="/api/v1/doctors", tags=["doctors"])
app.include_router(settings_router, prefix="/api/v1/settings", tags=["settings"])
app.include_router(tag_settings_router, prefix="/api/v1/tag-settings", tags=["tag-settings"]) 