from typing import Optional
from datetime import date
from pydantic import BaseModel
from .common import PaginatedResponse

# 1. Appointments Summary
class AppointmentSummaryItem(BaseModel):
    status: str
    appointment_type: str
    count: int

class AppointmentsSummaryResponse(BaseModel):
    data: list[AppointmentSummaryItem]
    total: int

# 2. Doctor Revenue
class DoctorRevenueItem(BaseModel):
    doctor_id: int
    doctor_name: str
    branch_name: str
    total_appointments: int
    total_revenue: float

class DoctorRevenueResponse(BaseModel):
    data: list[DoctorRevenueItem]
    total: int

# 3. Itemized Payments
class ItemizedPaymentItem(BaseModel):
    payment_date: date
    patient_name: str
    invoice_id: int
    amount: float
    payment_type: str
    running_total: float

class ItemizedPaymentResponse(PaginatedResponse[ItemizedPaymentItem]):
    pass

# 4. Outstanding Balances
class OutstandingBalanceItem(BaseModel):
    patient_id: int
    patient_name: str
    contact_number: str
    outstanding_balance: float

class OutstandingBalancesResponse(BaseModel):
    data: list[OutstandingBalanceItem]
    total: int

# 5. Treatment Categories
class TreatmentCategoryItem(BaseModel):
    category: str
    usage_count: int
    total_revenue: float

class TreatmentCategoriesResponse(BaseModel):
    data: list[TreatmentCategoryItem]
    total: int

# 6. Insurance vs Out-of-Pocket
class InsuranceVsOutOfPocketItem(BaseModel):
    branch_name: str
    total_insurance_covered: float
    total_out_of_pocket: float
    total_revenue: float

class InsuranceVsOutOfPocketResponse(BaseModel):
    data: list[InsuranceVsOutOfPocketItem]
    total: int
