from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import time, date, datetime

class SlotBase(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6, description="星期幾 (0-6: 週一到週日)")
    start_time: time
    end_time: time
    capacity: int = Field(..., ge=1, description="時段容量")
    doctor_id: int
    slot_config: Optional[Dict[str, Any]] = None

class SlotCreate(SlotBase):
    pass

class SlotUpdate(BaseModel):
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    capacity: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None
    slot_config: Optional[Dict[str, Any]] = None

class SlotResponse(SlotBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TimeSlotCapacity(BaseModel):
    start_time: str
    end_time: str
    capacity: int
    booked: int
    available: int
    doctor_id: int
    doctor_name: str

class DailyCapacityResponse(BaseModel):
    date: date
    day_of_week: int
    day_name: str
    time_slots: List[TimeSlotCapacity]
