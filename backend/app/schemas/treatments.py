from typing import Optional
from pydantic import BaseModel, Field


class TreatmentResponse(BaseModel):
    treatment_code: int
    treatment_name: str
    category: str
    price: float
    is_eligible_for_insurance: bool
    is_active: bool


class TreatmentCreateRequest(BaseModel):
    treatment_name: str = Field(..., min_length=2)
    category: str = Field(..., min_length=2)
    price: float = Field(..., gt=0)
    is_eligible_for_insurance: bool = True


class TreatmentUpdateRequest(BaseModel):
    treatment_name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    is_eligible_for_insurance: Optional[bool] = None
    is_active: Optional[bool] = None
