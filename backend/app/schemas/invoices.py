from pydantic import BaseModel, Field
from typing import List
from datetime import datetime

class InvoiceLineItem(BaseModel):
    treatment_name: str
    quantity: int
    unit_price: float
    total_price: float

class InvoicePayment(BaseModel):
    payment_date: datetime
    amount: float
    payment_type: str

class InvoiceDetailResponse(BaseModel):
    invoice_code: str
    total_amount: float
    insurance_amount: float
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
