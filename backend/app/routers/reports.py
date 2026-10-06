from fastapi import APIRouter, Depends,HTTPException
from asyncpg import Connection
from typing import Optional
from app.errors import ForbiddenError, NotFoundError, ConflictError, AppValidationError
from datetime import date, datetime
from app.db import get_conn
from app.dependencies import CurrentUser, require_roles, get_branch_scope, get_current_user, get_effective_branch_id
from app.schemas.reports import (
    AppointmentsSummaryResponse, AppointmentDailySummaryItem,
    DoctorRevenueResponse, DoctorRevenueItem,
    ItemizedPaymentResponse, ItemizedPaymentItem,
    OutstandingBalancesResponse, OutstandingBalanceItem,
    TreatmentCategoriesResponse, TreatmentCategoryItem,
    InsuranceVsOutOfPocketResponse, MonthlyLedgerItem, ProviderSplitItem, ClaimSlaItem, PaymentModeItem,
    PayoutHistoryItem, PayoutHistoryResponse, PayoutRequestItem, PayoutRequestsResponse, BankAccountsResponse, BankAccountItem,DoctorEarningsOverviewResponse,PayoutRequestCreate,
    AdminPayoutRequestItem, AdminPayoutRequestsResponse, PayoutDecisionRequest
)
from app.schemas.common import PaginationParams

router = APIRouter()

@router.get("/appointments-summary", response_model=AppointmentsSummaryResponse)
async def get_appointments_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    branch_id: Optional[int] = None,
    appointment_type: Optional[str] = None,
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager")),
    conn: Connection = Depends(get_conn)
):
    # Branch Manager is locked to their own branch even if the client sends a different one.
    actual_branch_id = get_effective_branch_id(current_user, branch_id)
    
    query = """
        SELECT 
            das.date,
            SUM(CASE WHEN a.status = 'Scheduled' THEN 1 ELSE 0 END) as scheduled,
            SUM(CASE WHEN a.status = 'Completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN a.status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled
        FROM appointments a
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        WHERE ($1::int IS NULL OR s.branch_id = $1)
          AND ($2::date IS NULL OR das.date >= $2)
          AND ($3::date IS NULL OR das.date <= $3)
          AND ($4::varchar IS NULL OR a.appointment_type::varchar = $4)
        GROUP BY das.date
        ORDER BY das.date ASC
    """
    records = await conn.fetch(query, actual_branch_id, start_date, end_date, appointment_type)
    
    totals_query = """
        SELECT
            COUNT(CASE WHEN a.status = 'Scheduled' THEN 1 END) as total_scheduled,
            COUNT(CASE WHEN a.status = 'Completed' THEN 1 END) as total_completed,
            COUNT(CASE WHEN a.status = 'Cancelled' THEN 1 END) as total_cancelled,
            COUNT(CASE WHEN a.appointment_type = 'Walk-in' THEN 1 END) as total_walkins
        FROM appointments a
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        WHERE ($1::int IS NULL OR s.branch_id = $1)
          AND ($2::date IS NULL OR das.date >= $2)
          AND ($3::date IS NULL OR das.date <= $3)
          AND ($4::varchar IS NULL OR a.appointment_type::varchar = $4)
    """
    totals = await conn.fetchrow(totals_query, actual_branch_id, start_date, end_date, appointment_type)
    
    daily_data = [
        AppointmentDailySummaryItem(
            date=r["date"],
            scheduled=int(r["scheduled"]),
            completed=int(r["completed"]),
            cancelled=int(r["cancelled"])
        ) for r in records
    ]
    
    return AppointmentsSummaryResponse(
        daily_data=daily_data,
        total_scheduled=int(totals["total_scheduled"]) if totals and totals["total_scheduled"] else 0,
        total_completed=int(totals["total_completed"]) if totals and totals["total_completed"] else 0,
        total_cancelled=int(totals["total_cancelled"]) if totals and totals["total_cancelled"] else 0,
        total_walkins=int(totals["total_walkins"]) if totals and totals["total_walkins"] else 0
    )

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
            COALESCE(sp.name, 'General OPD') as specialty,
            b.name as branch_name,
            COUNT(DISTINCT a.appointment_id) as total_appointments,
            COALESCE(SUM(CASE WHEN tc.category = 'Consultation' THEN ct.unit_price * ct.quantity ELSE 0 END), 0) as consult_revenue,
            COALESCE(SUM(CASE WHEN tc.category != 'Consultation' THEN ct.unit_price * ct.quantity ELSE 0 END), 0) as procedure_revenue,
            COALESCE(SUM(ct.unit_price * ct.quantity), 0) as total_revenue
        FROM appointments a
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        JOIN app_user u ON s.user_id = u.user_id
        JOIN branch b ON s.branch_id = b.branch_id
        JOIN doctor d ON s.user_id = d.user_id
        LEFT JOIN doctor_specialty ds ON d.user_id = ds.user_id
        LEFT JOIN specialty sp ON ds.specialty_id = sp.specialty_id
        JOIN consultations c ON a.appointment_id = c.appointment_id
        JOIN consultation_treatments ct ON c.consultation_id = ct.consultation_id
        JOIN treatment_catalogue tc ON ct.treatment_code = tc.treatment_code
        WHERE a.status = 'Completed'
          AND ($1::int IS NULL OR s.branch_id = $1)
          AND ($2::int IS NULL OR d.user_id = $2)
          AND ($3::date IS NULL OR das.date >= $3)
          AND ($4::date IS NULL OR das.date <= $4)
        GROUP BY d.user_id, u.first_name, u.last_name, COALESCE(sp.name, 'General OPD'), b.name
    """
    records = await conn.fetch(query, actual_branch_id, actual_doctor_id, start_date, end_date)
    
    data = [
        DoctorRevenueItem(
            doctor_id=r["doctor_id"],
            doctor_name=r["doctor_name"],
            specialty=r["specialty"],
            branch_name=r["branch_name"],
            total_appointments=r["total_appointments"],
            consult_revenue=float(r["consult_revenue"]),
            procedure_revenue=float(r["procedure_revenue"]),
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
    
    query = """
        SELECT 
            i.invoice_code as invoice_id,
            a.patient_id,
            u.first_name || ' ' || u.last_name as patient_name,
            c.phone_number as contact_number,
            i.total_amount,
            (i.insurance_amount + COALESCE(SUM(p.amount_paid), 0)) as paid_amount,
            (i.total_amount - i.insurance_amount - COALESCE(SUM(p.amount_paid), 0)) as due_amount,
            MAX(p.payment_date) as last_payment_date,
            (CURRENT_DATE - i.created_at::date) as aging_days,
            i.status
        FROM invoices i
        JOIN appointments a ON i.appointment_id = a.appointment_id
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        JOIN app_user u ON a.patient_id = u.user_id
        LEFT JOIN (
            SELECT user_id, phone_number,
                   ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY contact_id ASC) as rn
            FROM contact
        ) c ON u.user_id = c.user_id AND c.rn = 1
        LEFT JOIN payments p ON i.invoice_id = p.invoice_id
        WHERE i.status != 'Paid'
          AND ($1::int IS NULL OR s.branch_id = $1)
        GROUP BY i.invoice_code, a.patient_id, u.first_name, u.last_name, c.phone_number, i.total_amount, i.insurance_amount, i.created_at, i.status
        HAVING (i.total_amount - i.insurance_amount - COALESCE(SUM(p.amount_paid), 0)) > 0
        ORDER BY aging_days DESC
    """
    records = await conn.fetch(query, actual_branch_id)
    
    data = [
        OutstandingBalanceItem(
            invoice_id=r["invoice_id"],
            patient_id=r["patient_id"],
            patient_name=r["patient_name"],
            contact_number=r["contact_number"] or "N/A",
            total_amount=float(r["total_amount"]),
            paid_amount=float(r["paid_amount"]),
            due_amount=float(r["due_amount"]),
            last_payment_date=r["last_payment_date"].date() if hasattr(r["last_payment_date"], "date") else r["last_payment_date"],
            aging_days=int(r["aging_days"]) if r["aging_days"] is not None else 0,
            status=r["status"]
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
            tc.treatment_code,
            tc.treatment_name as treatment_item,
            tc.category,
            tc.is_active,
            COUNT(ct.treatment_code) as usage_count,
            COALESCE(SUM(ct.unit_price * ct.quantity), 0) as total_revenue
        FROM treatment_catalogue tc
        LEFT JOIN (
            SELECT ct2.treatment_code, ct2.unit_price, ct2.quantity
            FROM consultation_treatments ct2
            JOIN consultations c2 ON ct2.consultation_id = c2.consultation_id
            JOIN appointments a2 ON c2.appointment_id = a2.appointment_id AND a2.status = 'Completed'
            JOIN doctor_availability_slots das2 ON a2.slot_id = das2.slot_id
            JOIN staff s2 ON das2.doctor_id = s2.user_id
            WHERE ($1::int IS NULL OR s2.branch_id = $1)
              AND ($2::date IS NULL OR das2.date >= $2)
              AND ($3::date IS NULL OR das2.date <= $3)
        ) ct ON tc.treatment_code = ct.treatment_code
        GROUP BY tc.treatment_code, tc.treatment_name, tc.category, tc.is_active
        ORDER BY total_revenue DESC, usage_count DESC
    """
    records = await conn.fetch(query, actual_branch_id, start_date, end_date)
    
    catalog_query = "SELECT COUNT(*) as total_items, COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_items FROM treatment_catalogue"
    catalog_stats = await conn.fetchrow(catalog_query)
    
    data = [
        TreatmentCategoryItem(
            treatment_code=str(r["treatment_code"]),
            treatment_item=r["treatment_item"],
            category=r["category"],
            is_active=bool(r["is_active"]),
            usage_count=int(r["usage_count"]),
            total_revenue=float(r["total_revenue"])
        ) for r in records
    ]
    return TreatmentCategoriesResponse(
        data=data, 
        total=len(data),
        total_catalog_items=int(catalog_stats["total_items"]) if catalog_stats and catalog_stats["total_items"] is not None else 0,
        active_catalog_items=int(catalog_stats["active_items"]) if catalog_stats and catalog_stats["active_items"] is not None else 0
    )

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
    
    # 3. Claim SLAs
    sla_query = """
        SELECT 
            ipd.provider_name,
            AVG(EXTRACT(EPOCH FROM (p.payment_date - i.created_at::date)) / 86400.0) as avg_days
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.invoice_id
        JOIN appointments a ON i.appointment_id = a.appointment_id
        JOIN patient pt ON a.patient_id = pt.user_id
        JOIN patient_insurance pi ON pt.user_id = pi.patient_id
        JOIN insurance_policy_details ipd ON pi.policy_id = ipd.policy_id
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        WHERE p.payment_type = 'Insurance Settlement'
          AND ($1::int IS NULL OR s.branch_id = $1)
          AND ($2::date IS NULL OR das.date >= $2)
          AND ($3::date IS NULL OR das.date <= $3)
        GROUP BY ipd.provider_name
        ORDER BY avg_days ASC
    """
    sla_records = await conn.fetch(sla_query, actual_branch_id, start_date, end_date)
    claim_slas = [
        ClaimSlaItem(
            provider_name=r["provider_name"], 
            avg_days=float(r["avg_days"]) if r["avg_days"] is not None else 0.0
        ) for r in sla_records
    ]
    avg_claim_days = sum(c.avg_days for c in claim_slas) / len(claim_slas) if claim_slas else 0.0
    
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
        payment_modes=payment_modes,
        avg_claim_days=avg_claim_days
    )
@router.get("/doctor-earnings/{target_doctor_id}", response_model=DoctorEarningsOverviewResponse)
async def get_doctor_earnings(
    target_doctor_id : int,
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager","Doctor")),
    conn: Connection = Depends(get_conn)
):
    if current_user.role == "Doctor" and current_user.user_id != target_doctor_id:
        raise ForbiddenError("Doctors can only view their own earnings overview.")

    earned_query = """
    SELECT COALESCE(SUM(ct.unit_price * ct.quantity), 0) as total_earned
    FROM consultation_treatments ct
    JOIN consultations c ON ct.consultation_id = c.consultation_id
    JOIN appointments a ON c.appointment_id = a.appointment_id
    JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
    WHERE das.doctor_id = $1 AND a.status = 'Completed'
    """

    total_earned = await conn.fetchval(earned_query, target_doctor_id)

    paid_query = """
    SELECT COALESCE(SUM(amount_paid), 0) as total_paid
    FROM staff_payouts
    WHERE user_id = $1
    """
    
    paid_by_hospital = await conn.fetchval(paid_query, target_doctor_id)

    outstanding = float(total_earned or 0) - float(paid_by_hospital or 0)   

    return DoctorEarningsOverviewResponse(
        total_earned=float(total_earned or 0),
        paid_by_hospital=float(paid_by_hospital or 0),
        outstanding=outstanding
    )

@router.get("/doctor-earnings/{target_doctor_id}/bank-accounts", response_model=BankAccountsResponse)
async def get_doctor_bank_accounts(
    target_doctor_id: int,
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager","Doctor")),
    conn: Connection = Depends(get_conn)
):
    if current_user.role == "Doctor" and current_user.user_id != target_doctor_id:
        raise ForbiddenError("Doctors can only view their own bank accounts.")

    query = """
    SELECT account_id, bank_name, account_number, branch_name, is_default
    FROM staff_bank_accounts
    WHERE user_id = $1
    ORDER BY is_default DESC, created_at DESC    
    """

    records = await conn.fetch(query, target_doctor_id)
    data = [BankAccountItem(**dict(r)) for r in records]
    return BankAccountsResponse(data=data)  

@router.get("/doctor-earnings/{target_doctor_id}/payout-requests", response_model=PayoutRequestsResponse)
async def  get_doctor_payout_requests(
    target_doctor_id: int,
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Doctor")),
    conn: Connection = Depends(get_conn)
    ):

    if current_user.role == "Doctor" and current_user.user_id != target_doctor_id:
        raise ForbiddenError("Doctors can only view their own payout requests.")

    query = """
    SELECT 
        r.request_id, r.account_id, r.request_amount, r.status, 
        r.request_date, r.processed_date, r.remarks,
        b.bank_name, b.account_number
    FROM staff_payout_requests r
    JOIN staff_bank_accounts b ON r.account_id = b.account_id
    WHERE r.user_id = $1
    ORDER BY r.request_date DESC
    """

    records = await conn.fetch(query, target_doctor_id)
    
    data = [PayoutRequestItem(**dict(r)) for r in records]
    return PayoutRequestsResponse(data=data)

@router.get("/doctor-earnings/{target_doctor_id}/payouts", response_model=PayoutHistoryResponse)
async def get_doctor_payouts(
    target_doctor_id: int,
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Doctor")),
    conn: Connection = Depends(get_conn)
):
    if current_user.role == "Doctor" and current_user.user_id != target_doctor_id:
        raise ForbiddenError("Doctors can only view their own payout history.")

    query = """
    SELECT
        p.payout_id, p.amount_paid, p.payment_reference,
        p.payment_method, p.payment_date,
        b.bank_name, b.account_number
    FROM staff_payouts p
    JOIN staff_bank_accounts b ON p.account_id = b.account_id
    WHERE p.user_id = $1
    ORDER BY p.payment_date DESC
    """
    
    records = await conn.fetch(query, target_doctor_id)

    data = [PayoutHistoryItem(**dict(r)) for r in records]
    return PayoutHistoryResponse(data=data)

@router.post("/doctor-earnings/{target_doctor_id}/payout-requests")
async def create_doctor_payout_request(
    target_doctor_id: int,
    payload: PayoutRequestCreate,
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Doctor")),
    conn: Connection = Depends(get_conn)
):
    if current_user.role == "Doctor" and current_user.user_id != target_doctor_id:
        raise ForbiddenError("Doctors can only create payout requests for themselves.")

    if payload.request_amount <= 0:
        raise HTTPException(status_code=400, detail="Request amount must be greater than zero.")

    earned_query = """
    SELECT COALESCE(SUM(ct.unit_price * ct.quantity), 0)
    FROM consultation_treatments ct
    JOIN consultations c ON ct.consultation_id = c.consultation_id
    JOIN appointments a ON c.appointment_id = a.appointment_id
    JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
    WHERE das.doctor_id = $1 AND a.status = 'Completed'
    """
    
    earned = await conn.fetchval(earned_query, target_doctor_id) or 0.0

    paid_query = """
    SELECT COALESCE(SUM(amount_paid), 0)
    FROM staff_payouts
    WHERE user_id = $1
    """

    paid = await conn.fetchval(paid_query, target_doctor_id) or 0.0
    
    pending_query = """
    SELECT COALESCE(SUM(request_amount), 0)
    FROM staff_payout_requests
    WHERE user_id = $1 AND status IN ('Pending', 'Approved')
    """
    
    pending = await conn.fetchval(pending_query, target_doctor_id) or 0.0

    available = float(earned or 0.0) - float(paid or 0.0) - float(pending or 0.0)

    if payload.request_amount > available:
        raise HTTPException(
            status_code=400, 
            detail=f"Requested amount exceeds available balance. Available: Rs. {available:,.2f}"
        )

    insert_query = """
    INSERT INTO staff_payout_requests (
        user_id, account_id, request_amount, status
    ) VALUES ($1, $2, $3, 'Pending')
    RETURNING request_id
    """

    try:
        request_id = await conn.fetchval(
            insert_query,
            target_doctor_id,
            payload.account_id,
            payload.request_amount,
        )            

    except Exception as e:
        raise HTTPException(status_code=400, detail="Failed to create payout request. Check if the bank account is valid.")
    
    return {"message": "Payout request created successfully", "request_id": request_id}
    

@router.get("/doctor-payments", response_model=AdminPayoutRequestsResponse)
async def get_all_payout_requests(
    branch_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager")),
    conn: Connection = Depends(get_conn)
):

    """
    Admin/Branch Manager: list all doctor payout requests.
    Branch Managers are locked to their own branch.
    """
    actual_branch_id = get_effective_branch_id(current_user, branch_id)

    query = """
    SELECT 
    r.request_id,
    r.user_id,
    u.first_name || ' ' || u.last_name AS doctor_name,
    COALESCE(sp.name, 'General OPD') AS specialty,
    b.name AS branch_name,
    r.account_id,
    ba.bank_name,
    ba.account_number,
    r.request_amount,
    r.status,
    r.request_date,
    r.processed_date,
    r.remarks
    FROM staff_payout_requests r
    JOIN staff s ON r.user_id = s.user_id
    JOIN app_user u ON s.user_id = u.user_id
    JOIN branch b ON s.branch_id = b.branch_id
    LEFT JOIN doctor d ON s.user_id = d.user_id
    LEFT JOIN doctor_specialty ds ON d.user_id = ds.user_id
    LEFT JOIN specialty sp ON ds.specialty_id = sp.specialty_id
    JOIN staff_bank_accounts ba ON r.account_id = ba.account_id
    WHERE ($1::int IS NULL OR s.branch_id = $1)
    AND ($2::text IS NULL OR r.status = $2)
    ORDER BY r.request_date DESC
    """

    records = await conn.fetch(query, actual_branch_id, status)
    data = [AdminPayoutRequestItem(**dict(r)) for r in records]
    return AdminPayoutRequestsResponse(data=data, total=len(data))

@router.patch("/doctor-payments/{request_id}/pay")
async def pay_payout_request(
    request_id: int,
    body: PayoutDecisionRequest,
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager")),
    conn: Connection = Depends(get_conn)
):
    """Pay a pending payout request."""
    row = await conn.fetchrow(
        "SELECT request_id, status, user_id, account_id, request_amount FROM staff_payout_requests WHERE request_id = $1",
        request_id
    )

    if not row:
        raise HTTPException(status_code=404, detail="Request not found.")
    if row["status"] != "Pending":
        raise HTTPException(status_code=400, detail="Request is not pending.")
    
    async with conn.transaction():
        await conn.execute(
            """
            UPDATE staff_payout_requests
            SET status = 'Paid',
                processed_date = NOW(),
                remarks = $2
            WHERE request_id = $1
            """,
            request_id,
            body.remarks
        )

        await conn.execute(
            """
            INSERT INTO staff_payouts (user_id, request_id, account_id, amount_paid, payment_reference, payment_method)
            VALUES ($1, $2, $3, $4, $5, 'Bank Transfer')
            """,
            row["user_id"], request_id, row["account_id"], row["request_amount"], f"PAY-{request_id}"
        )

    return {"message": "Payout request marked as Paid.", "request_id": request_id}

@router.patch("/doctor-payments/{request_id}/reject")
async def reject_payout_request(
    request_id: int,
    body: PayoutDecisionRequest,
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager")),
    conn: Connection = Depends(get_conn)
):
    """Reject a pending payout request. Remarks/reason is required."""
    if not body.remarks or not body.remarks.strip():
        raise HTTPException(status_code=400, detail="A reason is required when rejecting a payout.")

    row = await conn.fetchrow(
        "SELECT request_id, status FROM staff_payout_requests WHERE request_id = $1",
        request_id
    )

    if not row:
        raise NotFoundError(f"Payout request {request_id} not found.")
    if row["status"] != "Pending":
        raise ConflictError(f"Cannot reject — request is already '{row['status']}'.")