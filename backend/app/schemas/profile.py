from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import date
from app.schemas.common import GenderEnum

class ProfileResponse(BaseModel):
    user_id: int
    username: str
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    birthdate: Optional[str] = None
    gender: Optional[GenderEnum] = None
    marital_status: Optional[str] = None
    address: Optional[str] = None
    id_number: Optional[str] = None
    role: str
    branch_id: Optional[int] = None
    branch_name: Optional[str] = None

class ProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    middle_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(None, max_length=20)
    birthdate: Optional[date] = None  # YYYY-MM-DD
    gender: Optional[GenderEnum] = None
    marital_status: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=255)

    @field_validator("birthdate")
    @classmethod
    def validate_birthdate(cls, v: Optional[date]) -> Optional[date]:
        if v is not None:
            if v > date.today():
                raise ValueError("Date of birth cannot be in the future.")
            if v.year < 1900:
                raise ValueError("Date of birth is invalid.")
        return v

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

