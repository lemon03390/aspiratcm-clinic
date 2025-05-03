from fastapi import APIRouter

from app.api.v1.endpoints import medical_records, reference_data
from app.api.v1.endpoints import settings, herbs, ai_recommendations
from app.api.v1.endpoints import patients

api_router = APIRouter()

api_router.include_router(medical_records.router, prefix="/medical-records", tags=["medical-records"])
api_router.include_router(reference_data.router, prefix="/reference-data", tags=["reference-data"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(herbs.router, prefix="/herbs", tags=["herbs"])
api_router.include_router(ai_recommendations.router, prefix="/ai", tags=["ai"])
api_router.include_router(patients.router, prefix="/patients", tags=["patients"]) 