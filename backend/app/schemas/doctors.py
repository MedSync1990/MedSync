from typing import List, Optional
from pydantic import BaseModel, Field


# Request body for updating doctor profile: PUT /doctors/{id}
class DoctorUpdate(BaseModel):
    # only doctor specific parts
    license_number: str = Field(..., min_length=1, max_length=50)

# Request body for updating doctor specialties: PUT /doctors/{id}/specialties
class DoctorSpecialtiesUpdate(BaseModel):
    add: List[int] = Field(default_factory=list)
    remove: List[int] = Field(default_factory=list)


# Response model: GET /doctors/{id}
class DoctorResponse(BaseModel):
    doctor_id: int  # user_id
    full_name: str
    id_number: str
    phone_numbers: List[str] = []
    email: Optional[str] = None
    branch_id: int
    branch_name: Optional[str] = None
    license_number: str
    is_active: bool
    specialties: List[str] = []


# Weekly schedule / roster models
class DoctorScheduleItem(BaseModel):
    schedule_id: Optional[int] = None
    doctor_id: Optional[int] = None
    day_of_week: int = Field(..., ge=0, le=6, description="0=Sunday, 1=Monday ... 6=Saturday")
    start_time: str = Field(..., description="Start time (HH:MM or HH:MM:SS)")
    end_time: str = Field(..., description="End time (HH:MM or HH:MM:SS)")
    slot_duration: int = Field(30, ge=5, le=120, description="Duration in minutes per consult")
    is_active: bool = True


class DoctorScheduleUpdate(BaseModel):
    schedules: List[DoctorScheduleItem]
