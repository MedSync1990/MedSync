# backend/app/schemas/patients.py
from datetime import date
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator
import re
from .common import GenderEnum


class PatientInsuranceCreate(BaseModel):
    provider_name: str = Field(..., min_length=1, max_length=100)
    insurance_card_number: str = Field(..., min_length=1, max_length=40)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    corporate_affiliation: Optional[str] = None


class PatientCreateRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=60)
    middle_name: Optional[str] = Field(None, max_length=60)
    last_name: str = Field(..., min_length=1, max_length=60)
    id_number: str = Field(..., description="12 digits or 9 digits followed by V/X")
    birthdate: Optional[date] = None
    date_of_birth: Optional[date] = None
    gender: GenderEnum = GenderEnum.Male
    address: str = Field(..., min_length=3, max_length=255)
    email: Optional[str] = None
    phone_numbers: Optional[List[str]] = None
    phone_number: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    contact_name: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    registered_branch: Optional[int] = None
    insurance: Optional[PatientInsuranceCreate] = None
    allergy_ids: Optional[List[int]] = None
    is_temp: bool = False

    @field_validator("id_number")
    @classmethod
    def validate_nic(cls, v: str) -> str:
        nic = v.strip().upper()
        if not re.match(r"^([0-9]{9}[VX]|[0-9]{12})$", nic):
            raise ValueError("NIC must be 9 digits followed by V/X or 12 computerised digits.")
        return nic

    @property
    def resolved_birthdate(self) -> date:
        return self.birthdate or self.date_of_birth or date(1990, 1, 1)

    @property
    def resolved_phones(self) -> List[str]:
        candidates = []
        if self.phone_numbers:
            candidates.extend(self.phone_numbers)
        if self.phone_number:
            candidates.append(self.phone_number)
        
        normalized = []
        for raw in candidates:
            digits = "".join(filter(str.isdigit, raw or ""))
            if len(digits) == 11 and digits.startswith("94"):
                digits = "0" + digits[2:]
            elif len(digits) == 9:
                digits = "0" + digits
            if len(digits) == 10 and digits not in normalized:
                normalized.append(digits)
        return normalized

    @property
    def resolved_emergency_phone(self) -> Optional[str]:
        raw = self.emergency_contact or self.emergency_contact_phone
        if not raw:
            return None
        digits = "".join(filter(str.isdigit, raw))
        if len(digits) == 11 and digits.startswith("94"):
            digits = "0" + digits[2:]
        elif len(digits) == 9:
            digits = "0" + digits
        return digits if len(digits) == 10 else None

    @property
    def resolved_contact_name(self) -> str:
        return (self.contact_name or self.emergency_contact_name or "").strip() or "Emergency Contact"


class PatientAllergyItem(BaseModel):
    allergy_id: int
    allergy_code: str
    name: str


class PatientUpdateRequest(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=60)
    middle_name: Optional[str] = Field(None, max_length=60)
    last_name: Optional[str] = Field(None, min_length=1, max_length=60)
    id_number: Optional[str] = Field(None, description="12 digits or 9 digits followed by V/X")
    birthdate: Optional[date] = None
    date_of_birth: Optional[date] = None
    gender: Optional[GenderEnum] = None
    address: Optional[str] = Field(None, min_length=3, max_length=255)
    email: Optional[str] = None
    phone_numbers: Optional[List[str]] = None
    phone_number: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    contact_name: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    allergy_ids: Optional[List[int]] = None
    is_temp: Optional[bool] = None

    @field_validator("id_number")
    @classmethod
    def validate_nic(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        nic = v.strip().upper()
        if not re.match(r"^([0-9]{9}[VX]|[0-9]{12})$", nic):
            raise ValueError("NIC must be 9 digits followed by V/X or 12 computerised digits.")
        return nic


class PatientResponse(BaseModel):
    patient_id: int
    patient_code: str
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    id_number: str
    phone_number: str
    email: Optional[str] = None
    date_of_birth: str
    gender: str
    address: str
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    contact_name: Optional[str] = None
    registered_branch: Optional[int] = None
    branch_name: Optional[str] = None
    has_insurance: bool = False
    registered_date: Optional[str] = None
    is_active: bool = True
    is_temp: bool = False
    allergies: List[PatientAllergyItem] = Field(default_factory=list)


class PatientListItem(BaseModel):
    patient_id: int
    patient_code: str
    first_name: str
    last_name: str
    id_number: str
    phone_number: str
    gender: str
    date_of_birth: str
    registered_branch: Optional[int] = None
    branch_name: Optional[str] = None
    has_insurance: bool = False
    is_active: bool = True
    is_temp: bool = False


class PatientListResponse(BaseModel):
    data: List[PatientListItem]
    total: int
    page: int
    limit: int


# for walk-in appointments quickly create a patient
class QuickPatientCreateRequest(BaseModel):
    # only first name is mandatory
    first_name: str = Field(..., min_length=1, max_length=60)
    last_name: Optional[str] = Field(default="(Walk-in Patient)", max_length=60)
    middle_name: Optional[str] = Field(None, max_length=60)
    id_number: Optional[str] = Field(None, description="Optional. If not provided a temporary NIC is generated")
    address: Optional[str] = Field(default="Address Pending", max_length=255)
    gender: GenderEnum = Field(default=GenderEnum.Male)
    birthdate: Optional[date] = None
    date_of_birth: Optional[date] = None
    age: Optional[int] = Field(None, ge=0, le=120)
    phone_number: Optional[str] = None
    phone_numbers: Optional[List[str]] = None
    email: Optional[str] = None
    registered_branch: Optional[int] = None

    @field_validator("id_number")
    @classmethod
    def validate_nic(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        nic = v.strip().upper()
        if not re.match(r"^([0-9]{9}[VX]|[0-9]{12})$", nic):
            raise ValueError("NIC must be 9 digits followed by V/X or 12 computerised digits.")
        return nic

    @property
    def resolved_birthdate(self) -> date:
        if self.birthdate:
            return self.birthdate
        if self.date_of_birth:
            return self.date_of_birth
        if self.age is not None:
            curr_year = date.today().year
            birth_year = max(1900, curr_year - self.age)
            return date(birth_year, 1, 1)
        return date(1900, 1, 1)

    @property
    def resolved_phones(self) -> List[str]:
        candidates = []
        if self.phone_numbers:
            candidates.extend(self.phone_numbers)
        if self.phone_number:
            candidates.append(self.phone_number)
        
        normalized = []
        for raw in candidates:
            digits = "".join(filter(str.isdigit, raw or ""))
            if len(digits) == 11 and digits.startswith("94"):
                digits = "0" + digits[2:]
            elif len(digits) == 9:
                digits = "0" + digits
            if len(digits) == 10 and digits not in normalized:
                normalized.append(digits)
        return normalized