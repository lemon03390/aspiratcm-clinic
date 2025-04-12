from fastapi import APIRouter

from app.api.v1.endpoints import appointments, doctors, patients
from app.api.v1.endpoints import medical_records, reference_data

api_router = APIRouter()

api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
api_router.include_router(doctors.router, prefix="/doctors", tags=["doctors"])
api_router.include_router(patients.router, prefix="/patients", tags=["patients"])
api_router.include_router(medical_records.router, prefix="/medical-records", tags=["medical-records"])
api_router.include_router(reference_data.router, prefix="/reference-data", tags=["reference-data"]) 