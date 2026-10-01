from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class InvoiceLineItem(BaseModel):
    treatment_name: str
    service_code: str
    quantity: int
    unit_price: float
    total_price: float


class InvoicePayment(BaseModel):
    payment_date: datetime
    amount: float
    payment_type: str


class InvoiceDetailResponse(BaseModel):
    invoice_code: str

    patient_name: str
    patient_nic: str
    patient_id: str

    doctor_name: str
    unit_name: str

    total_amount: float
    insurance_amount: float
    insurance_percentage: float
    insurance_policy_number: Optional[str] = None

    status: str
    created_at: datetime
    outstanding_balance: float

    items: List[InvoiceLineItem] = Field(default_factory=list)
    payments: List[InvoicePayment] = Field(default_factory=list)


class PatientInvoiceItem(BaseModel):
    invoice_code: str
    created_at: datetime
    total_amount: float
    insurance_amount: float
    outstanding_balance: float
    status: str


class PatientInvoicesResponse(BaseModel):
    data: List[PatientInvoiceItem]


class RecentInvoiceItem(BaseModel):
    invoice_code: str
    patient_name: str
    created_at: datetime
    total_amount: float
    outstanding_balance: float
    status: str


class RecentInvoicesResponse(BaseModel):
    data: List[RecentInvoiceItem]



class RecordPaymentRequest(BaseModel):
    amount: float = Field(gt=0, description="Amount to pay against the invoice")
    payment_type: str = Field(description="Payment type: Cash, Card / POS, or LankaPay / QR")
    reference: Optional[str] = Field(default=None, description="Optional POS slip number or remarks")


class RecordPaymentResponse(BaseModel):
    message: str
    invoice_code: str
    amount_paid: float
    outstanding_balance: float
    status: str


class PatientBalanceResponse(BaseModel):
    patient_id: int
    outstanding_balance: float