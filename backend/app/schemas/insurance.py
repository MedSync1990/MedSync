from pydantic import BaseModel, constr
from datetime import date
from typing import List

class VerifyInsuranceRequest(BaseModel):
    patient_id :int
    policy_id: int
    insurance_card_number: str
    start_date: date
    end_date: date

class VerifyInsuranceResponse(BaseModel):
    message: str
    insurance_id: int
    patient_id: int
    policy_id: int
    insurance_card_number: str
    start_date: date
    end_date: date

class PatientInsuranceItem(BaseModel):
    insurance_id: int 
    provider_name: str
    policy_name: str
    insurance_card_number: str
    start_date: date
    end_date: date
    is_active: bool


class PatientInsuranceResponse(BaseModel):
    data: List[PatientInsuranceItem]

class PatientBalanceResponse(BaseModel):
    patient_id: int
    outstanding_balance: float

    