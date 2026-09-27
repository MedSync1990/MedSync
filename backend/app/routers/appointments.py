import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from asyncpg import Connection, PostgresError

from app.db import get_conn
from app.dependencies import require_roles
from app.errors import NotFoundError, ConflictError, AppValidationError
from app.schemas.consultations import (
    AppointmentCompleteRequest,
    AppointmentCompleteResponse,
    ConsultationDetailResponse,
    ConsultationTreatmentItem,
)

router = APIRouter()


@router.get(
    "",
    summary="List appointments",
    dependencies=[Depends(require_roles("Doctor", "Receptionist", "Administrator", "Branch Manager"))],
)
async def list_appointments(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (e.g. Scheduled, Completed, Cancelled)"),
    patient_id: Optional[int] = Query(None, description="Filter by patient user_id"),
    doctor_id: Optional[int] = Query(None, description="Filter by doctor user_id"),
    limit: int = Query(50, ge=1, le=100),
    conn: Connection = Depends(get_conn),
):
    conditions = []
    params = []

    if status_filter and status_filter.strip().lower() != "all":
        params.append(status_filter.strip())
        conditions.append(f"a.status::text = ${len(params)}")
# ─────────────────────────────────────────────────────────────────────────────
# 1. GET /doctors/{id}/availability?date=
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/doctors/{id}/availability", response_model=List[DoctorSlotResponse])
async def get_doctor_availability(
    id: int,
    date: date = Query(..., description="Availability date (YYYY-MM-DD)"),
    include_booked: bool = Query(False, description="Include booked slots"),
    conn: Connection = Depends(get_db),
    user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Doctor", "Receptionist")),
):
    """
    Returns available slots for the given doctor and date.
    Drives Book Appointment step 4 time chips and schedule conflict avoidance.
    """
    # Verify doctor exists
    doctor = await conn.fetchrow("SELECT user_id FROM doctor WHERE user_id = $1;", id)
    if not doctor:
        raise NotFoundError("Doctor not found.")

    if include_booked:
        query = """
            SELECT slot_id, doctor_id, date, start_time, end_time, status
            FROM doctor_availability_slots
            WHERE doctor_id = $1 AND date = $2
            ORDER BY start_time ASC;
        """
    else:
        query = """
            SELECT slot_id, doctor_id, date, start_time, end_time, status
            FROM doctor_availability_slots
            WHERE doctor_id = $1 AND date = $2 AND status = 'Open'
            ORDER BY start_time ASC;
        """
    rows = await conn.fetch(query, id, date)
    return [
        DoctorSlotResponse(
            slot_id=r["slot_id"],
            doctor_id=r["doctor_id"],
            date=r["date"],
            start_time=r["start_time"],
            end_time=r["end_time"],
            status=SlotStatusEnum(r["status"]),
        )
        for r in rows
    ]

    if patient_id:
        params.append(patient_id)
        conditions.append(f"a.patient_id = ${len(params)}")

    if doctor_id:
        params.append(doctor_id)
        conditions.append(f"d.user_id = ${len(params)}")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""
        SELECT 
            a.appointment_id,
            a.appointment_code,
            a.patient_id,
            a.slot_id,
            a.appointment_type::text AS appointment_type,
            a.status::text AS status,
            a.created_at,
            pu.first_name AS patient_first_name,
            pu.last_name AS patient_last_name,
            pu.id_number AS patient_id_number,
            p.patient_code,
            s.date AS slot_date,
            s.start_time,
            s.end_time,
            d.user_id AS doctor_id,
            du.first_name AS doctor_first_name,
            du.last_name AS doctor_last_name
        FROM appointments a
        JOIN patient p ON a.patient_id = p.user_id
        JOIN app_user pu ON p.user_id = pu.user_id
        LEFT JOIN doctor_availability_slots s ON a.slot_id = s.slot_id
        LEFT JOIN doctor d ON s.doctor_id = d.user_id
        LEFT JOIN app_user du ON d.user_id = du.user_id
        {where_clause}
        ORDER BY a.appointment_id DESC
        LIMIT {limit}
    """
    rows = await conn.fetch(query, *params)
    return [
        {
            "appointment_id": r["appointment_id"],
            "appointment_code": r["appointment_code"],
            "patient_id": r["patient_id"],
            "patient_name": f"{r['patient_first_name']} {r['patient_last_name']}".strip(),
            "patient_code": r["patient_code"],
            "patient_id_number": r["patient_id_number"],
            "doctor_id": r["doctor_id"],
            "doctor_name": f"Dr. {r['doctor_first_name']} {r['doctor_last_name']}".strip() if r["doctor_first_name"] else None,
            "slot_date": str(r["slot_date"]) if r["slot_date"] else None,
            "start_time": str(r["start_time"]) if r["start_time"] else None,
            "end_time": str(r["end_time"]) if r["end_time"] else None,
            "appointment_type": r["appointment_type"],
            "status": r["status"],
            "created_at": r["created_at"],
        }
        for r in rows
    ]


# ─────────────────────────────────────────────────────────────────────────────
# 2. GET /appointments (Manage Appointments table & filters)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("", response_model=AppointmentListResponse)
async def list_appointments(
    branch: Optional[int] = Query(None, description="Filter by branch ID"),
    date: Optional[date] = Query(None, description="Filter by appointment date"),
    status: Optional[str] = Query(None, description="Filter by status (Scheduled/Completed/Cancelled)"),
    doctor: Optional[int] = Query(None, description="Filter by doctor user ID"),
    patient_id: Optional[int] = Query(None, description="Filter by patient user ID"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(25, ge=1, le=100, description="Items per page"),
    conn: Connection = Depends(get_db),
    user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Receptionist")),
):
    """
    List appointments with filters. Branch Manager is locked to their own branch.
    """
    scoped_branch_id = user.branch_id if user.role == "Branch Manager" else branch
    offset = (page - 1) * limit

    base_where = """
        WHERE ($1::int IS NULL OR s.branch_id = $1)
          AND ($2::date IS NULL OR das.date = $2)
          AND ($3::text IS NULL OR a.status::text = $3)
          AND ($4::int IS NULL OR das.doctor_id = $4)
          AND ($5::int IS NULL OR a.patient_id = $5)
    """

    count_query = f"""
        SELECT COUNT(*)
        FROM appointments a
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        {base_where};
    """
    total = await conn.fetchval(count_query, scoped_branch_id, date, status, doctor, patient_id)

    data_query = f"""
        SELECT
            a.appointment_id,
            a.appointment_code,
            a.patient_id,
            a.slot_id,
            a.appointment_type::text AS appointment_type,
            a.status::text AS status,
            a.created_at,
            pu.first_name AS patient_first_name,
            pu.last_name AS patient_last_name,
            pu.id_number AS patient_id_number,
            p.patient_code,
            s.date AS slot_date,
            s.start_time,
            s.end_time,
            d.user_id AS doctor_id,
            du.first_name AS doctor_first_name,
            du.last_name AS doctor_last_name
        FROM appointments a
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        JOIN branch b ON s.branch_id = b.branch_id
        JOIN app_user pu ON a.patient_id = pu.user_id
        JOIN app_user du ON das.doctor_id = du.user_id
        {base_where}
        ORDER BY das.date DESC, das.start_time DESC
        LIMIT $6 OFFSET $7;
    """
    rows = await conn.fetch(data_query, scoped_branch_id, date, status, doctor, patient_id, limit, offset)

    items = [
        AppointmentResponse(
            appointment_id=r["appointment_id"],
            appointment_code=r["appointment_code"],
            patient_id=r["patient_id"],
            patient_name=r["patient_name"],
            doctor_id=r["doctor_id"],
            doctor_name=r["doctor_name"],
            branch_id=r["branch_id"],
            branch_name=r["branch_name"],
            slot_id=r["slot_id"],
            appointment_date=r["appointment_date"],
            start_time=r["start_time"],
            end_time=r["end_time"],
            appointment_type=AppointmentTypeEnum(r["appointment_type"]),
            status=AppointmentStatusEnum(r["status"]),
            created_at=r["created_at"],
        )
        for r in rows
    ]

    return AppointmentListResponse(data=items, total=total or 0, page=page, limit=limit)


# ─────────────────────────────────────────────────────────────────────────────
# 3. GET /appointments/{id}
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{id}", response_model=AppointmentResponse)
async def get_appointment(
    id: int,
    conn: Connection = Depends(get_db),
    user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Receptionist", "Doctor")),
):
    """
    Get full appointment detail.
    BM gets 404 for appointments in other branches.
    """
    appt = await _fetch_appointment_detail(conn, id)
    if not appt:
        raise NotFoundError("Appointment not found.")

    if user.role == "Branch Manager" and user.branch_id is not None and appt.branch_id != user.branch_id:
        raise NotFoundError("Appointment not found.")

    return appt


# ─────────────────────────────────────────────────────────────────────────────
# 4. POST /appointments (Book appointment)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def book_appointment(
    payload: AppointmentBookRequest,
    conn: Connection = Depends(get_db),
    user: CurrentUser = Depends(require_roles("Receptionist")),
):
    """
    Completes a scheduled appointment by executing the PostgreSQL stored procedure fn_complete_appointment().
    Validates notes, transitions status to 'Completed', records clinical consultation and treatment snapshot lines,
    computes insurance coverage, and generates the final billing invoice.
    (FR-CTM-06/07/08, api-routes.md §6.2, database.md §7.5).
    """
    notes = (payload.consultation_notes or "").strip()
    if not notes:
        raise AppValidationError([
            {
                "field": "consultation_notes",
                "message": "Add consultation notes before completing this appointment.",
            }
        ])

    treatments_payload = [
        {"treatment_code": t.treatment_code, "quantity": t.quantity}
        for t in (payload.treatments or [])
    ]
    treatments_json = json.dumps(treatments_payload)

    try:
        invoice_id = await conn.fetchval(
            "SELECT fn_complete_appointment($1, $2, $3, $4::jsonb)",
            appointment_id,
            payload.diagnosis.strip() if payload.diagnosis else "General Clinical Consultation",
            notes,
            treatments_json,
        )
    except PostgresError as exc:
        msg = str(exc)
        if "consultation notes are required" in msg:
            raise AppValidationError([
                {
                    "field": "consultation_notes",
                    "message": "Add consultation notes before completing this appointment.",
                }
            ])
        if "does not exist" in msg:
            raise NotFoundError(f"Appointment {appointment_id} does not exist.")
        if "only a Scheduled appointment can be completed" in msg:
            raise ConflictError(f"Cannot complete appointment: {msg}")
        if "not a valid active catalogue entry" in msg or "treatment quantity" in msg:
            raise ConflictError(f"Invalid treatment order: {msg}")
        raise ConflictError(f"Encounter completion failed: {msg}")

    return AppointmentCompleteResponse(
        appointment_id=appointment_id,
        invoice_id=invoice_id,
        status="Completed",
        message="Appointment completed. Invoice generated.",
    )


@router.get(
    "/{appointment_id}/consultation",
    response_model=ConsultationDetailResponse,
    dependencies=[Depends(require_roles("Doctor", "Receptionist", "Administrator", "Branch Manager"))],
    summary="Get consultation clinical notes and attached treatments",
)
async def get_appointment_consultation(
    appointment_id: int,
    conn: Connection = Depends(get_conn),
):
    """
    Returns consultation notes, diagnosis, and snapshotted treatment lines for an appointment (api-routes.md §6.2).
    """
    consult_row = await conn.fetchrow(
        """
        SELECT consultation_id, appointment_id, diagnosis, consultation_notes, created_date AS created_at
        FROM consultations
        WHERE appointment_id = $1
        """,
        appointment_id,
    )
    if not consult_row:
        raise NotFoundError(f"No consultation recorded for appointment {appointment_id}.")

    treatments_rows = await conn.fetch(
        """
        SELECT 
            ct.treatment_code,
            tc.treatment_name,
            tc.category,
            ct.quantity,
            ct.unit_price,
            (ct.quantity * ct.unit_price) AS subtotal
        FROM consultation_treatments ct
        LEFT JOIN treatment_catalogue tc ON ct.treatment_code = tc.treatment_code
        WHERE ct.consultation_id = $1
        ORDER BY ct.treatment_code ASC
        """,
        consult_row["consultation_id"],
    )

    treatments = [
        ConsultationTreatmentItem(
            treatment_code=tr["treatment_code"],
            treatment_name=tr["treatment_name"] or f"Treatment #{tr['treatment_code']}",
            category=tr["category"] or "General",
            quantity=tr["quantity"],
            unit_price=float(tr["unit_price"]),
            subtotal=float(tr["subtotal"]),
        )
        for tr in treatments_rows
    ]

    return ConsultationDetailResponse(
        consultation_id=consult_row["consultation_id"],
        appointment_id=consult_row["appointment_id"],
        diagnosis=consult_row["diagnosis"],
        consultation_notes=consult_row["consultation_notes"],
        created_at=consult_row["created_at"],
        treatments=treatments,
    )
