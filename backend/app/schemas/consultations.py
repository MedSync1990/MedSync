from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class TreatmentOrderInput(BaseModel):
    treatment_code: int
    quantity: int = Field(default=1, ge=1)


class AppointmentCompleteRequest(BaseModel):
    diagnosis: Optional[str] = ""
    consultation_notes: str = Field(..., min_length=1, description="Clinical notes required before completing appointment")
    treatments: Optional[List[TreatmentOrderInput]] = []


class AppointmentCompleteResponse(BaseModel):
    appointment_id: int
    invoice_id: int
    status: str = "Completed"
    message: str = "Appointment completed. Invoice generated."


class ConsultationTreatmentItem(BaseModel):
    treatment_code: int
    treatment_name: Optional[str] = None
    category: Optional[str] = None
    quantity: int
    unit_price: float
    subtotal: float


class ConsultationDetailResponse(BaseModel):
    consultation_id: int
    appointment_id: int
    diagnosis: Optional[str] = None
    consultation_notes: Optional[str] = None
    created_at: Optional[datetime] = None
    treatments: List[ConsultationTreatmentItem] = []
