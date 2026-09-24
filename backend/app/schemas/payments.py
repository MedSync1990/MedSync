from pydantic import BaseModel, Field
from typing import Optional


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
