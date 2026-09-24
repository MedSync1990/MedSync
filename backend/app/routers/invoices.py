from fastapi import APIRouter, Depends, Path, Query
from asyncpg import Connection, PostgresError, RaiseError
from typing import List, Optional
from datetime import datetime
from app.db import get_conn
from app.dependencies import CurrentUser, require_roles, get_current_user
from app.errors import NotFoundError, ConflictError, AppValidationError
from app.schemas.invoices import (
    InvoiceDetailResponse,
    InvoiceLineItem,
    InvoicePayment,
    PatientInvoiceItem,
    PatientInvoicesResponse,
    PatientBalanceResponse,
    RecentInvoiceItem,
    RecentInvoicesResponse
)

router = APIRouter()


async def fetch_invoice_by_id_or_code(conn: Connection, identifier: str, search_type: str = "invoice"):
    """
    Helper to fetch core invoice header, patient info, doctor info, and branch info
    given an invoice ID, invoice code, or NIC.
    """
    is_numeric = identifier.isdigit()

    query = """
        SELECT 
            i.invoice_id,
            i.invoice_code,
            i.total_amount,
            i.insurance_amount,
            i.status,
            i.created_at,
            i.consultation_id,
            a.patient_id,
            p.patient_code,
            pu.first_name || ' ' || pu.last_name AS patient_name,
            pu.id_number AS patient_nic,
            du.first_name || ' ' || du.last_name AS doctor_name,
            b.name AS unit_name,
            pi.insurance_card_number AS insurance_policy_number
        FROM invoices i
        JOIN appointments a ON i.appointment_id = a.appointment_id
        JOIN patient p ON a.patient_id = p.user_id
        JOIN app_user pu ON p.user_id = pu.user_id
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        JOIN app_user du ON s.user_id = du.user_id
        JOIN branch b ON s.branch_id = b.branch_id
        LEFT JOIN patient_insurance pi ON p.user_id = pi.patient_id
        LEFT JOIN insurance_policy_details ipd ON pi.policy_id = ipd.policy_id
        WHERE ($1::boolean AND $4::text != 'nic' AND i.invoice_id = $2::int)
           OR ($4::text != 'nic' AND UPPER(i.invoice_code) = UPPER($3::text))
           OR ($4::text = 'nic' AND UPPER(pu.id_number) = UPPER($3::text))
        ORDER BY i.created_at DESC
        LIMIT 1
    """
    int_val = 0
    if is_numeric:
        val = int(identifier)
        if val > 2147483647:
            is_numeric = False
        else:
            int_val = val
            
    row = await conn.fetchrow(query, is_numeric, int_val, identifier, search_type)
    return row


@router.get("/recent", response_model=RecentInvoicesResponse)
async def get_recent_invoices(
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Receptionist")),
    conn: Connection = Depends(get_conn)
):
    query = """
        SELECT 
            i.invoice_code,
            pu.first_name || ' ' || pu.last_name AS patient_name,
            i.created_at,
            i.total_amount,
            i.insurance_amount,
            i.status,
            COALESCE(SUM(p.amount_paid), 0) AS total_paid
        FROM invoices i
        JOIN appointments a ON i.appointment_id = a.appointment_id
        JOIN patient pat ON a.patient_id = pat.user_id
        JOIN app_user pu ON pat.user_id = pu.user_id
        LEFT JOIN payments p ON i.invoice_id = p.invoice_id
        GROUP BY i.invoice_id, i.invoice_code, patient_name, i.created_at, i.total_amount, i.insurance_amount, i.status
        ORDER BY i.created_at DESC
        LIMIT 5
    """
    rows = await conn.fetch(query)
    items = []
    for r in rows:
        tot = float(r["total_amount"])
        ins = float(r["insurance_amount"])
        paid = float(r["total_paid"])
        outstanding = max(0.0, round(tot - ins - paid, 2))
        items.append(
            RecentInvoiceItem(
                invoice_code=r["invoice_code"],
                patient_name=r["patient_name"],
                created_at=r["created_at"],
                total_amount=tot,
                outstanding_balance=outstanding,
                status=r["status"]
            )
        )
    return RecentInvoicesResponse(data=items)


@router.get("/{identifier}", response_model=InvoiceDetailResponse)
async def get_invoice_detail(
    identifier: str = Path(..., description="Invoice ID, Invoice Code, or Patient NIC (e.g. 1, INV-000001, 123456789V)"),
    type: Optional[str] = Query("invoice", description="Search type: 'invoice' or 'nic'"),
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Receptionist")),
    conn: Connection = Depends(get_conn)
):
    search_type = type if type is not None else "invoice"
    inv = await fetch_invoice_by_id_or_code(conn, identifier, search_type)
    if not inv:
        if search_type == "nic":
            raise AppValidationError([{"field": "identifier", "message": "Enter Valid NIC Number"}])
        else:
            raise AppValidationError([{"field": "identifier", "message": "Enter Valid Invoice Code"}])

    invoice_id = inv["invoice_id"]
    consultation_id = inv["consultation_id"]

    # 1. Fetch Line Items
    items_query = """
        SELECT 
            tc.treatment_name AS treatment_name,
            ct.treatment_code AS service_code,
            ct.quantity,
            ct.unit_price,
            (ct.quantity * ct.unit_price) AS total_price
        FROM consultation_treatments ct
        JOIN treatment_catalogue tc ON ct.treatment_code = tc.treatment_code
        WHERE ct.consultation_id = $1
        ORDER BY tc.treatment_name ASC
    """
    item_rows = await conn.fetch(items_query, consultation_id)
    items = [
        InvoiceLineItem(
            treatment_name=r["treatment_name"],
            service_code=str(r["service_code"]),
            quantity=r["quantity"],
            unit_price=float(r["unit_price"]),
            total_price=float(r["total_price"])
        )
        for r in item_rows
    ]

    # 2. Fetch Payments History
    payments_query = """
        SELECT payment_date, amount_paid, payment_type
        FROM payments
        WHERE invoice_id = $1
        ORDER BY payment_date ASC
    """
    payment_rows = await conn.fetch(payments_query, invoice_id)
    payments = [
        InvoicePayment(
            payment_date=r["payment_date"],
            amount=float(r["amount_paid"]),
            payment_type=r["payment_type"]
        )
        for r in payment_rows
    ]

    total_amount = float(inv["total_amount"])
    insurance_amount = float(inv["insurance_amount"])
    total_paid = sum(p.amount for p in payments)
    outstanding_balance = max(0.0, round(total_amount - insurance_amount - total_paid, 2))

    insurance_percentage = 0.0
    if total_amount > 0:
        insurance_percentage = round((insurance_amount / total_amount) * 100.0, 2)

    return InvoiceDetailResponse(
        invoice_code=inv["invoice_code"],
        patient_name=inv["patient_name"],
        patient_nic=inv["patient_nic"] or "",
        patient_id=inv["patient_code"] or str(inv["patient_id"]),
        doctor_name=inv["doctor_name"],
        unit_name=inv["unit_name"],
        total_amount=total_amount,
        insurance_amount=insurance_amount,
        insurance_percentage=insurance_percentage,
        insurance_policy_number=inv["insurance_policy_number"],
        status=inv["status"],
        created_at=inv["created_at"],
        outstanding_balance=outstanding_balance,
        items=items,
        payments=payments
    )



@router.get("/patient/{patient_id}", response_model=PatientInvoicesResponse)
async def get_patient_invoices(
    patient_id: int = Path(..., description="Patient User ID"),
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Receptionist")),
    conn: Connection = Depends(get_conn)
):
    query = """
        SELECT 
            i.invoice_id,
            i.invoice_code,
            i.created_at,
            i.total_amount,
            i.insurance_amount,
            i.status,
            COALESCE(SUM(p.amount_paid), 0) AS total_paid
        FROM invoices i
        JOIN appointments a ON i.appointment_id = a.appointment_id
        LEFT JOIN payments p ON i.invoice_id = p.invoice_id
        WHERE a.patient_id = $1
        GROUP BY i.invoice_id, i.invoice_code, i.created_at, i.total_amount, i.insurance_amount, i.status
        ORDER BY i.created_at DESC
    """
    rows = await conn.fetch(query, patient_id)
    items = []
    for r in rows:
        tot = float(r["total_amount"])
        ins = float(r["insurance_amount"])
        paid = float(r["total_paid"])
        outstanding = max(0.0, round(tot - ins - paid, 2))
        items.append(
            PatientInvoiceItem(
                invoice_code=r["invoice_code"],
                created_at=r["created_at"],
                total_amount=tot,
                insurance_amount=ins,
                outstanding_balance=outstanding,
                status=r["status"]
            )
        )

    return PatientInvoicesResponse(data=items)


@router.get("/patient/{patient_id}/balance", response_model=PatientBalanceResponse)
async def get_patient_balance(
    patient_id: int = Path(..., description="Patient User ID"),
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Receptionist")),
    conn: Connection = Depends(get_conn)
):
    query = """
        SELECT 
            i.invoice_id,
            i.total_amount,
            i.insurance_amount,
            COALESCE(SUM(p.amount_paid), 0) AS total_paid
        FROM invoices i
        JOIN appointments a ON i.appointment_id = a.appointment_id
        LEFT JOIN payments p ON i.invoice_id = p.invoice_id
        WHERE a.patient_id = $1 AND i.status != 'Paid'
        GROUP BY i.invoice_id, i.total_amount, i.insurance_amount
    """
    rows = await conn.fetch(query, patient_id)
    total_outstanding = 0.0
    for r in rows:
        tot = float(r["total_amount"])
        ins = float(r["insurance_amount"])
        paid = float(r["total_paid"])
        out = max(0.0, tot - ins - paid)
        total_outstanding += out

    return PatientBalanceResponse(
        patient_id=patient_id,
        outstanding_balance=round(total_outstanding, 2)
    )

