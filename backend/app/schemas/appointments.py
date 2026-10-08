import datetime as dt
from datetime import datetime, time
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


# 1. Enums matching PostgreSQL types
class AppointmentTypeEnum(str, Enum):
    scheduled = "Scheduled Visit"
    walk_in = "Walk-in"
    follow_up = "Follow-up"


class AppointmentStatusEnum(str, Enum):
    scheduled = "Scheduled"
    completed = "Completed"
    cancelled = "Cancelled"


class SlotStatusEnum(str, Enum):
    open = "Open"
    booked = "Booked"
    blocked = "Blocked"


# 2. GET /doctors/{id}/availability?date=YYYY-MM-DD
# Returns available slots for time chips in Book Appointment 
class DoctorSlotResponse(BaseModel):
    slot_id: int
    doctor_id: int
    date: dt.date = Field(..., description="Date of the slot")
    start_time: time
    end_time: time
    status: SlotStatusEnum


# 3. POST /appointments
# Book a regular appointment against an existing Open slot
class AppointmentBookRequest(BaseModel):
    patient_id: int = Field(..., description="ID of the patient")
    doctor_id: int = Field(..., description="ID of the selected doctor")
    slot_id: int = Field(..., description="Target availability slot ID")
    appointment_type: AppointmentTypeEnum = Field(
        default=AppointmentTypeEnum.scheduled,
        description="Type of appointment",
    )


# 4. POST /appointments/walk-in
# Emergency walk-in booking without prior slot (calls fn_create_walk_in)
class WalkInAppointmentRequest(BaseModel):
    patient_id: int = Field(..., description="ID of the patient")
    doctor_id: int = Field(..., description="ID of the doctor")
    date: dt.date = Field(..., description="Date for the walk-in")
    start_time: time = Field(..., description="Start time for the consultation")
    end_time: time = Field(..., description="End time for the consultation")


# 5. PUT /appointments/{id}/reschedule
# Moves an existing Scheduled appointment to a new slot (calls fn_reschedule_appointment)
# appointment id passed directly in rest api path
class AppointmentRescheduleRequest(BaseModel):
    new_slot_id: int = Field(..., description="The new target slot ID")


class AppointmentTreatmentRequest(BaseModel):
    treatment_id: int = Field(..., gt=0)
    quantity: int = Field(default=1, ge=1)


class AppointmentCompleteRequest(BaseModel):
    diagnosis: str = Field(..., min_length=1, max_length=255)
    consultation_notes: str = Field(..., min_length=1)
    treatments: List[AppointmentTreatmentRequest] = Field(default_factory=list)

    @field_validator("diagnosis", "consultation_notes")
    @classmethod
    def require_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field is required.")
        return value


class AppointmentCompleteResponse(BaseModel):
    appointment_id: int
    invoice_id: int
    message: str


class ConsultationTreatmentResponse(BaseModel):
    treatment_id: int
    treatment_name: str
    category: Optional[str] = None
    quantity: int


class ConsultationResponse(BaseModel):
    consultation_id: int
    appointment_id: int
    diagnosis: Optional[str] = None
    consultation_notes: str
    created_date: datetime
    treatments: List[ConsultationTreatmentResponse] = Field(default_factory=list)


# 6. GET /appointments/{id} & Item in List Response
class AppointmentResponse(BaseModel):
    appointment_id: int
    appointment_code: str = Field(..., description="Format: APT-xxxxxx")
    patient_id: int
    patient_name: str
    patient_nic: Optional[str] = None
    is_temp: bool = False
    doctor_id: int
    doctor_name: str
    branch_id: int
    branch_name: Optional[str] = None    # allowing flexibility to not join branch table
    slot_id: int
    appointment_date: dt.date
    start_time: time
    end_time: time
    appointment_type: AppointmentTypeEnum
    status: AppointmentStatusEnum
    created_at: datetime


# 7. GET /appointments Envelope (matches docs/api-routes.md §0.1 response envelope)
class AppointmentListResponse(BaseModel):
    data: List[AppointmentResponse]
    total: int
    page: int
    limit: int
