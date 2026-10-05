from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class TreatmentCreateRequest(BaseModel):
    treatment_name: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., min_length=1, max_length=50)
    price: Decimal = Field(..., gt=0, max_digits=10, decimal_places=2)
    is_eligible_for_insurance: bool = False

    @field_validator("treatment_name", "category")
    @classmethod
    def require_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field is required.")
        return value


class TreatmentUpdateRequest(TreatmentCreateRequest):
    pass


class TreatmentResponse(BaseModel):
    treatment_code: int
    treatment_name: str
    category: str
    price: Decimal
    is_eligible_for_insurance: bool
    is_active: bool
