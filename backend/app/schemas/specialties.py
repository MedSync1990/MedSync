from typing import Optional
from pydantic import BaseModel, Field

# Request when admin creates a specialty
class SpecialtyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Name of the specialty")
    description: Optional[str] = Field(None, max_length=500, description="Optional specialty description")


# Response model
class SpecialtyResponse(BaseModel):
    specialty_id: int
    name: str
    description: Optional[str] = None
    doctor_count: int = 0
