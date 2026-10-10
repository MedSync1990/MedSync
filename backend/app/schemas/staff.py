from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date
from .common import GenderEnum

class StaffBankAccount(BaseModel):
    bank_name: str
    account_number: str
    bank_branch: str

class StaffCreate(BaseModel):
    role_id: int
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    id_number: str
    address: Optional[str] = None
    birthdate: date
    gender: GenderEnum
    email: Optional[EmailStr] = None
    phone_number: str
    branch_id: int
    specialty: Optional[str] = None
    license_number: Optional[str] = None
    bank_accounts: Optional[List[StaffBankAccount]] = None

class StaffUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    address: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    branch_id: Optional[int] = None
    is_active: Optional[bool] = None

class StaffResetPassword(BaseModel):
    password: str

class StaffResponse(BaseModel):
    user_id: int
    username: str
    is_active: bool
    branch_id: int
    first_name: str
    last_name: str
    id_number: str
    email: Optional[str] = None
    role_name: str
    phone_number: Optional[str] = None
    must_change_password: Optional[bool] = None
