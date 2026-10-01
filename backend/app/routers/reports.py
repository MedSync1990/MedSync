from fastapi import APIRouter, Depends, Query
from asyncpg import Connection
from typing import Optional
from datetime import date, datetime
from app.db import get_conn
from app.dependencies import CurrentUser, require_roles, get_branch_scope, get_current_user, get_effective_branch_id
from app.schemas.reports import (
    AppointmentsSummaryResponse, AppointmentSummaryItem,
    DoctorRevenueResponse, DoctorRevenueItem,
    ItemizedPaymentResponse, ItemizedPaymentItem,
    OutstandingBalancesResponse, OutstandingBalanceItem,
    TreatmentCategoriesResponse, TreatmentCategoryItem,
    InsuranceVsOutOfPocketResponse, MonthlyLedgerItem, ProviderSplitItem, ClaimSlaItem, PaymentModeItem
)
from app.schemas.common import PaginationParams

router = APIRouter()

@router.get("/appointments-summary", response_model=AppointmentsSummaryResponse)
async def get_appointments_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    branch_id: Optional[int] = None,
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager")),
    conn: Connection = Depends(get_conn)
):
    # Branch Manager is locked to their own branch even if the client sends a different one.
    actual_branch_id = get_effective_branch_id(current_user, branch_id)
    
    query = """
        SELECT a.status, a.appointment_type, COUNT(*) as count
        FROM appointments a
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        WHERE ($1::int IS NULL OR s.branch_id = $1)
          AND ($2::date IS NULL OR das.date >= $2)
          AND ($3::date IS NULL OR das.date <= $3)
        GROUP BY a.status, a.appointment_type
    """
    records = await conn.fetch(query, actual_branch_id, start_date, end_date)
    
    data = [
        AppointmentSummaryItem(
            status=r["status"],
            appointment_type=r["appointment_type"],
            count=r["count"]
        ) for r in records
    ]
    
    return AppointmentsSummaryResponse(data=data, total=sum(d.count for d in data))

@router.get("/doctor-revenue", response_model=DoctorRevenueResponse)
async def get_doctor_revenue(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    branch_id: Optional[int] = None,
    doctor_id: Optional[int] = None,
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Doctor")),
    conn: Connection = Depends(get_conn)
):
    actual_branch_id = get_effective_branch_id(current_user, branch_id)
    actual_doctor_id = doctor_id if current_user.role != "Doctor" else current_user.user_id
    
    query = """
        SELECT 
            d.user_id as doctor_id,
            u.first_name || ' ' || u.last_name as doctor_name,
            b.name as branch_name,
            COUNT(DISTINCT a.appointment_id) as total_appointments,
            COALESCE(SUM(ct.unit_price * ct.quantity), 0) as total_revenue
        FROM appointments a
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        JOIN app_user u ON s.user_id = u.user_id
        JOIN branch b ON s.branch_id = b.branch_id
        JOIN doctor d ON s.user_id = d.user_id
        JOIN consultations c ON a.appointment_id = c.appointment_id
        JOIN consultation_treatments ct ON c.consultation_id = ct.consultation_id
        WHERE a.status = 'Completed'
          AND ($1::int IS NULL OR s.branch_id = $1)
          AND ($2::int IS NULL OR d.user_id = $2)
          AND ($3::date IS NULL OR das.date >= $3)
          AND ($4::date IS NULL OR das.date <= $4)
        GROUP BY d.user_id, u.first_name, u.last_name, b.name
    """
    records = await conn.fetch(query, actual_branch_id, actual_doctor_id, start_date, end_date)
    
    data = [
        DoctorRevenueItem(
            doctor_id=r["doctor_id"],
            doctor_name=r["doctor_name"],
            branch_name=r["branch_name"],
            total_appointments=r["total_appointments"],
            total_revenue=float(r["total_revenue"])
        ) for r in records
    ]
    return DoctorRevenueResponse(data=data, total=len(data))

@router.get("/doctor-revenue/{target_doctor_id}/payments", response_model=ItemizedPaymentResponse)
async def get_doctor_itemized_payments(
    target_doctor_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    pagination: PaginationParams = Depends(),
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Doctor")),
    conn: Connection = Depends(get_conn)
):
    from app.errors import ForbiddenError
    
    if current_user.role == "Doctor" and current_user.user_id != target_doctor_id:
        raise ForbiddenError("Doctors can only view their own itemized payments.")
        
    actual_branch_id = get_effective_branch_id(current_user, None)
    
    count_query = """
        SELECT COUNT(*)
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.invoice_id
        JOIN consultations c ON i.appointment_id = c.appointment_id
        JOIN appointments a ON c.appointment_id = a.appointment_id
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        WHERE das.doctor_id = $1
          AND ($2::int IS NULL OR s.branch_id = $2)
          AND ($3::date IS NULL OR p.payment_date::date >= $3)
          AND ($4::date IS NULL OR p.payment_date::date <= $4)
    """
    total_val = await conn.fetchval(count_query, target_doctor_id, actual_branch_id, start_date, end_date)
    total = int(total_val) if total_val is not None else 0
    
    if total == 0:
        return ItemizedPaymentResponse(data=[], total=0)
        
    query = """
        SELECT 
            p.payment_date,
            u.first_name || ' ' || COALESCE(u.middle_name || ' ', '') || u.last_name as patient_name,
            i.invoice_id,
            p.amount_paid as amount,
            p.payment_type,
            SUM(p.amount_paid) OVER (ORDER BY p.payment_date ASC, p.payment_id ASC) as running_total
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.invoice_id
        JOIN consultations c ON i.appointment_id = c.appointment_id
        JOIN appointments a ON c.appointment_id = a.appointment_id
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        JOIN app_user u ON a.patient_id = u.user_id
        WHERE das.doctor_id = $1
          AND ($2::int IS NULL OR s.branch_id = $2)
          AND ($3::date IS NULL OR p.payment_date::date >= $3)
          AND ($4::date IS NULL OR p.payment_date::date <= $4)
        ORDER BY p.payment_date DESC, p.payment_id DESC
        LIMIT $5 OFFSET $6
    """
    records = await conn.fetch(
        query, 
        target_doctor_id, actual_branch_id, start_date, end_date, 
        pagination.limit, pagination.offset
    )
    
    data = [
        ItemizedPaymentItem(
            payment_date=r["payment_date"].date() if isinstance(r["payment_date"], datetime) else r["payment_date"],
            patient_name=r["patient_name"],
            invoice_id=r["invoice_id"],
            amount=float(r["amount"]),
            payment_type=r["payment_type"],
            running_total=float(r["running_total"])
        ) for r in records
    ]
    return ItemizedPaymentResponse(data=data, total=total)

@router.get("/outstanding-balances", response_model=OutstandingBalancesResponse)
async def get_outstanding_balances(
    branch_id: Optional[int] = None,
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager")),
    conn: Connection = Depends(get_conn)
):
    actual_branch_id = get_effective_branch_id(current_user, branch_id)
    
    # We sum outstanding balance per patient across all their non-Paid invoices
    query = """
        WITH invoice_balances AS (
            SELECT 
                i.invoice_id,
                a.patient_id,
                s.branch_id,
                (i.total_amount - i.insurance_amount - COALESCE(SUM(p.amount_paid), 0)) as outstanding
            FROM invoices i
            JOIN appointments a ON i.appointment_id = a.appointment_id
            JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
            JOIN staff s ON das.doctor_id = s.user_id
            LEFT JOIN payments p ON i.invoice_id = p.invoice_id
            WHERE i.status != 'Paid'
            GROUP BY i.invoice_id, a.patient_id, s.branch_id, i.total_amount, i.insurance_amount
        )
        SELECT 
            ib.patient_id,
            u.first_name || ' ' || u.last_name as patient_name,
            c.phone_number as contact_number,
            SUM(ib.outstanding) as outstanding_balance
        FROM invoice_balances ib
        JOIN app_user u ON ib.patient_id = u.user_id
        LEFT JOIN (
            SELECT user_id, phone_number,
                   ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY contact_id ASC) as rn
            FROM contact
        ) c ON u.user_id = c.user_id AND c.rn = 1
        WHERE ($1::int IS NULL OR ib.branch_id = $1)
        GROUP BY ib.patient_id, u.first_name, u.last_name, c.phone_number
        HAVING SUM(ib.outstanding) > 0
    """
    records = await conn.fetch(query, actual_branch_id)
    
    data = [
        OutstandingBalanceItem(
            patient_id=r["patient_id"],
            patient_name=r["patient_name"],
            contact_number=r["contact_number"] or "N/A",
            outstanding_balance=float(r["outstanding_balance"])
        ) for r in records
    ]
    return OutstandingBalancesResponse(data=data, total=len(data))

@router.get("/treatment-categories", response_model=TreatmentCategoriesResponse)
async def get_treatment_categories(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    branch_id: Optional[int] = None,
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager")),
    conn: Connection = Depends(get_conn)
):
    actual_branch_id = get_effective_branch_id(current_user, branch_id)
    
    query = """
        SELECT 
            tc.category,
            COUNT(ct.treatment_code) as usage_count,
            COALESCE(SUM(ct.unit_price * ct.quantity), 0) as total_revenue
        FROM consultation_treatments ct
        JOIN treatment_catalogue tc ON ct.treatment_code = tc.treatment_code
        JOIN consultations c ON ct.consultation_id = c.consultation_id
        JOIN appointments a ON c.appointment_id = a.appointment_id
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        WHERE a.status = 'Completed'
          AND ($1::int IS NULL OR s.branch_id = $1)
          AND ($2::date IS NULL OR das.date >= $2)
          AND ($3::date IS NULL OR das.date <= $3)
        GROUP BY tc.category
    """
    records = await conn.fetch(query, actual_branch_id, start_date, end_date)
    
    data = [
        TreatmentCategoryItem(
            category=r["category"],
            usage_count=r["usage_count"],
            total_revenue=float(r["total_revenue"])
        ) for r in records
    ]
    return TreatmentCategoriesResponse(data=data, total=len(data))

@router.get("/insurance-vs-out-of-pocket", response_model=InsuranceVsOutOfPocketResponse)
async def get_insurance_vs_out_of_pocket(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    branch_id: Optional[int] = None,
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager")),
    conn: Connection = Depends(get_conn)
):
    actual_branch_id = get_effective_branch_id(current_user, branch_id)
    
    # 1. Monthly Ledger
    ledger_query = """
        SELECT 
            TO_CHAR(DATE_TRUNC('month', i.created_at), 'Mon YYYY') as period,
            DATE_TRUNC('month', i.created_at) as sort_date,
            COALESCE(SUM(i.insurance_amount), 0) as total_insurance_covered,
            COALESCE(SUM(i.total_amount - i.insurance_amount), 0) as total_out_of_pocket,
            COALESCE(SUM(i.total_amount), 0) as total_revenue,
            COUNT(i.invoice_id) as volume
        FROM invoices i
        JOIN appointments a ON i.appointment_id = a.appointment_id
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        WHERE ($1::int IS NULL OR s.branch_id = $1)
          AND ($2::date IS NULL OR das.date >= $2)
          AND ($3::date IS NULL OR das.date <= $3)
        GROUP BY DATE_TRUNC('month', i.created_at)
        ORDER BY sort_date DESC
    """
    ledger_records = await conn.fetch(ledger_query, actual_branch_id, start_date, end_date)
    
    ledger = [
        MonthlyLedgerItem(
            period=r["period"],
            total_insurance_covered=float(r["total_insurance_covered"]),
            total_out_of_pocket=float(r["total_out_of_pocket"]),
            total_revenue=float(r["total_revenue"]),
            volume=r["volume"]
        ) for r in ledger_records
    ]
    
    # 2. Provider Split
    provider_query = """
        SELECT 
            ipd.provider_name,
            COALESCE(SUM(i.insurance_amount), 0) as amount
        FROM invoices i
        JOIN appointments a ON i.appointment_id = a.appointment_id
        JOIN patient p ON a.patient_id = p.user_id
        JOIN patient_insurance pi ON p.user_id = pi.patient_id
        JOIN insurance_policy_details ipd ON pi.policy_id = ipd.policy_id
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        WHERE ($1::int IS NULL OR s.branch_id = $1)
          AND ($2::date IS NULL OR das.date >= $2)
          AND ($3::date IS NULL OR das.date <= $3)
          AND i.insurance_amount > 0
          AND pi.is_active = TRUE
        GROUP BY ipd.provider_name
        ORDER BY amount DESC
    """
    provider_records = await conn.fetch(provider_query, actual_branch_id, start_date, end_date)
    total_prov = sum(r["amount"] for r in provider_records)
    
    provider_split = [
        ProviderSplitItem(
            provider_name=r["provider_name"],
            amount=float(r["amount"]),
            percentage=float(r["amount"] / total_prov * 100) if total_prov > 0 else 0
        ) for r in provider_records
    ]
    
    # 3. Claim SLAs (Mocked for UI demo purposes)
    claim_slas = [
        ClaimSlaItem(provider_name="Sri Lanka Insurance (SLIC)", avg_days=3.4),
        ClaimSlaItem(provider_name="Ceylinco General Insurance", avg_days=4.1),
        ClaimSlaItem(provider_name="AIA Health & Softlogic", avg_days=5.2),
    ]
    
    # 4. Payment Modes
    payment_query = """
        SELECT 
            pay.payment_type,
            COALESCE(SUM(pay.amount_paid), 0) as amount
        FROM payments pay
        JOIN invoices i ON pay.invoice_id = i.invoice_id
        JOIN appointments a ON i.appointment_id = a.appointment_id
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        WHERE ($1::int IS NULL OR s.branch_id = $1)
          AND ($2::date IS NULL OR das.date >= $2)
          AND ($3::date IS NULL OR das.date <= $3)
          AND pay.payment_type != 'Insurance Settlement'
        GROUP BY pay.payment_type
        ORDER BY amount DESC
    """
    payment_records = await conn.fetch(payment_query, actual_branch_id, start_date, end_date)
    total_pay = sum(r["amount"] for r in payment_records)
    
    payment_modes = [
        PaymentModeItem(
            payment_type=r["payment_type"],
            amount=float(r["amount"]),
            percentage=float(r["amount"] / total_pay * 100) if total_pay > 0 else 0
        ) for r in payment_records
    ]
    
    return InsuranceVsOutOfPocketResponse(
        ledger=ledger,
        provider_split=provider_split,
        claim_slas=claim_slas,
        payment_modes=payment_modes
    )
