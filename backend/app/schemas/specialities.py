from typing import Optional
from pydantic import BaseModel, Field

# request when admin creates a speciality
class SpecialityCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Name of the speciality")
    description: Optional[str] = Field(None, max_length=500, description="Optional speciality description") 

# Response model
class SpecialityResponse(BaseModel):
    speciality_id: int
    name: str
    description: str | None = None
    doctor_count: int = 0
