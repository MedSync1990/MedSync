from typing import List
from pydantic import BaseModel, Field


class AllergyResponse(BaseModel):
    allergy_id: int
    allergy_code: str
    name: str


class AllergyCreateRequest(BaseModel):
    allergy_code: str = Field(..., min_length=2, max_length=20)
    name: str = Field(..., min_length=2, max_length=100)


class PatientAllergiesUpdateRequest(BaseModel):
    allergy_ids: List[int]
