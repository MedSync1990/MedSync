from fastapi import status
from typing import Optional
from datetime import date
from pydantic import BaseModel
from .common import PaginatedResponse

# 1. Appointments Summary
class AppointmentDailySummaryItem(BaseModel):
    date: date
    scheduled: int
    completed: int
    cancelled: int

class AppointmentsSummaryResponse(BaseModel):
    daily_data: list[AppointmentDailySummaryItem]
    total_scheduled: int
    total_completed: int
    total_cancelled: int
    total_walkins: int

# 2. Doctor Revenue
class DoctorRevenueItem(BaseModel):
    doctor_id: int
    doctor_name: str
    specialty: str
    branch_name: str
    total_appointments: int
    consult_revenue: float
    procedure_revenue: float
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
    invoice_id: str
    patient_id: int
    patient_name: str
    contact_number: str
    total_amount: float
    paid_amount: float
    due_amount: float
    last_payment_date: Optional[date]
    aging_days: int
    status: str

class OutstandingBalancesResponse(BaseModel):
    data: list[OutstandingBalanceItem]
    total: int

# 5. Treatment Categories
class TreatmentCategoryItem(BaseModel):
    treatment_code: str
    treatment_item: str
    category: str
    is_active: bool
    usage_count: int
    total_revenue: float

class TreatmentCategoriesResponse(BaseModel):
    data: list[TreatmentCategoryItem]
    total: int
    total_catalog_items: int
    active_catalog_items: int

# 6. Insurance vs Out-of-Pocket
class MonthlyLedgerItem(BaseModel):
    period: str
    total_insurance_covered: float
    total_out_of_pocket: float
    total_revenue: float
    volume: int

class ProviderSplitItem(BaseModel):
    provider_name: str
    amount: float
    percentage: float

class ClaimSlaItem(BaseModel):
    provider_name: str
    avg_days: float

class PaymentModeItem(BaseModel):
    payment_type: str
    amount: float
    percentage: float

class InsuranceVsOutOfPocketResponse(BaseModel):
    ledger: list[MonthlyLedgerItem]
    provider_split: list[ProviderSplitItem]
    claim_slas: list[ClaimSlaItem]
    payment_modes: list[PaymentModeItem]
    avg_claim_days: float

class DoctorEarningsOverviewResponse(BaseModel):
    total_earned: float
    paid_by_hospital: float
    outstanding:float

class BankAccountItem(BaseModel):
    account_id: int
    bank_name: str
    account_number: str
    branch_name:Optional[str]
    is_default:bool

class BankAccountsResponse(BaseModel):
    data: list[BankAccountItem]

class PayoutRequestCreate(BaseModel):
    account_id: int
    request_amount: float

class PayoutRequestItem(BaseModel):
    request_id:int
    account_id:int
    request_amount: float
    status:str
    request_date: date
    processed_date: Optional[date]
    remarks: Optional[str]
    bank_name:str
    account_number:str

class PayoutRequestsResponse(BaseModel):
    data: list[PayoutRequestItem]

class PayoutHistoryItem(BaseModel):
    payout_id: int
    amount_paid:float
    payment_reference: str
    payment_method: str
    payment_date:  date
    bank_name: str
    account_number: str
    
class PayoutHistoryResponse(BaseModel):
    data: list[PayoutHistoryItem]
    