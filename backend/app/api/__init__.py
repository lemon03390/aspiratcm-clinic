from .appointments import router as appointments_router
from .doctors import router as doctors_router
from .health import router as health_router
from .appointment_detail import router as appointment_detail_router
from .patient_registration import router as patient_registration_router

__all__ = ["appointments_router", "doctors_router", "health_router", "appointment_detail_router", "patient_registration_router"]
