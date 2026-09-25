from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from asyncpg import Connection, PostgresError

from app.dependencies import get_db, require_roles, get_branch_scope, CurrentUser
from app.schemas.appointments import (
    AppointmentBookRequest,
    WalkInAppointmentRequest,
    AppointmentRescheduleRequest,
    AppointmentResponse,
    AppointmentListResponse,
    DoctorSlotResponse,
    SlotStatusEnum,
    AppointmentTypeEnum,
    AppointmentStatusEnum,
)
from app.errors import NotFoundError, ConflictError, ForbiddenError, AppValidationError

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# 1. GET /doctors/{id}/availability?date=
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/doctors/{id}/availability", response_model=List[DoctorSlotResponse])
async def get_doctor_availability(
    id: int,
    date: date = Query(..., description="Availability date (YYYY-MM-DD)"),
    conn: Connection = Depends(get_db),
    user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Doctor", "Receptionist")),
):
    """
    Returns available open slots for the given doctor and date.
    Drives Book Appointment step 4 time chips.
    """
    # Verify doctor exists
    doctor = await conn.fetchrow("SELECT user_id FROM doctor WHERE user_id = $1;", id)
    if not doctor:
        raise NotFoundError("Doctor not found.")

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


# ─────────────────────────────────────────────────────────────────────────────
# Helper to fetch full appointment detail
# ─────────────────────────────────────────────────────────────────────────────
async def _fetch_appointment_detail(conn: Connection, appointment_id: int) -> Optional[AppointmentResponse]:
    query = """
        SELECT
            a.appointment_id,
            a.appointment_code,
            a.patient_id,
            TRIM(CONCAT(pu.first_name, ' ', COALESCE(pu.middle_name || ' ', ''), pu.last_name)) AS patient_name,
            das.doctor_id,
            TRIM(CONCAT(du.first_name, ' ', COALESCE(du.middle_name || ' ', ''), du.last_name)) AS doctor_name,
            s.branch_id,
            b.name AS branch_name,
            a.slot_id,
            das.date AS appointment_date,
            das.start_time,
            das.end_time,
            a.appointment_type,
            a.status,
            a.created_at
        FROM appointments a
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        JOIN branch b ON s.branch_id = b.branch_id
        JOIN app_user pu ON a.patient_id = pu.user_id
        JOIN app_user du ON das.doctor_id = du.user_id
        WHERE a.appointment_id = $1;
    """
    r = await conn.fetchrow(query, appointment_id)
    if not r:
        return None

    return AppointmentResponse(
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


# ─────────────────────────────────────────────────────────────────────────────
# 2. GET /appointments (Manage Appointments table & filters)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("", response_model=AppointmentListResponse)
async def list_appointments(
    branch: Optional[int] = Query(None, description="Filter by branch ID"),
    date: Optional[date] = Query(None, description="Filter by appointment date"),
    status: Optional[str] = Query(None, description="Filter by status (Scheduled/Completed/Cancelled)"),
    doctor: Optional[int] = Query(None, description="Filter by doctor user ID"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(25, ge=1, le=100, description="Items per page"),
    conn: Connection = Depends(get_db),
    user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Receptionist")),
):
    """
    List appointments with filters. Branch Manager is locked to their own branch.
    """
    scoped_branch_id = get_branch_scope(user) or branch
    offset = (page - 1) * limit

    base_where = """
        WHERE ($1::int IS NULL OR s.branch_id = $1)
          AND ($2::date IS NULL OR das.date = $2)
          AND ($3::text IS NULL OR a.status::text = $3)
          AND ($4::int IS NULL OR das.doctor_id = $4)
    """

    count_query = f"""
        SELECT COUNT(*)
        FROM appointments a
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        {base_where};
    """
    total = await conn.fetchval(count_query, scoped_branch_id, date, status, doctor)

    data_query = f"""
        SELECT
            a.appointment_id,
            a.appointment_code,
            a.patient_id,
            TRIM(CONCAT(pu.first_name, ' ', COALESCE(pu.middle_name || ' ', ''), pu.last_name)) AS patient_name,
            das.doctor_id,
            TRIM(CONCAT(du.first_name, ' ', COALESCE(du.middle_name || ' ', ''), du.last_name)) AS doctor_name,
            s.branch_id,
            b.name AS branch_name,
            a.slot_id,
            das.date AS appointment_date,
            das.start_time,
            das.end_time,
            a.appointment_type,
            a.status,
            a.created_at
        FROM appointments a
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        JOIN branch b ON s.branch_id = b.branch_id
        JOIN app_user pu ON a.patient_id = pu.user_id
        JOIN app_user du ON das.doctor_id = du.user_id
        {base_where}
        ORDER BY das.date DESC, das.start_time DESC
        LIMIT $5 OFFSET $6;
    """
    rows = await conn.fetch(data_query, scoped_branch_id, date, status, doctor, limit, offset)

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
    scoped_branch_id = get_branch_scope(user)
    appt = await _fetch_appointment_detail(conn, id)
    if not appt:
        raise NotFoundError("Appointment not found.")

    if scoped_branch_id is not None and appt.branch_id != scoped_branch_id:
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
    Book an appointment against an open slot.
    Calls fn_book_appointment() inside a transaction and translates slot conflicts into a clean 409.
    """
    # Verify patient exists
    patient = await conn.fetchval("SELECT user_id FROM patient WHERE user_id = $1;", payload.patient_id)
    if not patient:
        raise NotFoundError("Patient not found.")

    try:
        appt_id = await conn.fetchval(
            "SELECT fn_book_appointment($1, $2, $3::appointment_type_enum);",
            payload.patient_id,
            payload.slot_id,
            payload.appointment_type.value,
        )
    except PostgresError as e:
        err_msg = str(e)
        if "is no longer available" in err_msg or "does not exist" in err_msg:
            raise ConflictError("This doctor is no longer available at the selected time. Please choose another slot.")
        raise ConflictError(err_msg)

    created = await _fetch_appointment_detail(conn, appt_id)
    if not created:
        raise NotFoundError("Failed to retrieve created appointment.")
    return created


# ─────────────────────────────────────────────────────────────────────────────
# 5. POST /appointments/walk-in (Walk-in emergency booking)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/walk-in", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_walk_in_appointment(
    payload: WalkInAppointmentRequest,
    conn: Connection = Depends(get_db),
    user: CurrentUser = Depends(require_roles("Receptionist")),
):
    """
    Create an emergency walk-in appointment.
    Calls fn_create_walk_in() and checks for overlap via exclusion constraint.
    """
    # Verify patient and doctor exist
    patient = await conn.fetchval("SELECT user_id FROM patient WHERE user_id = $1;", payload.patient_id)
    if not patient:
        raise NotFoundError("Patient not found.")

    doctor = await conn.fetchval("SELECT user_id FROM doctor WHERE user_id = $1;", payload.doctor_id)
    if not doctor:
        raise NotFoundError("Doctor not found.")

    try:
        appt_id = await conn.fetchval(
            "SELECT fn_create_walk_in($1, $2, $3, $4, $5);",
            payload.doctor_id,
            payload.patient_id,
            payload.date,
            payload.start_time,
            payload.end_time,
        )
    except PostgresError as e:
        err_msg = str(e)
        if "is already booked over this time range" in err_msg or "excl_slot_overlap" in err_msg:
            raise ConflictError("This doctor is already booked over this time range. Please choose another time.")
        raise ConflictError(err_msg)

    created = await _fetch_appointment_detail(conn, appt_id)
    if not created:
        raise NotFoundError("Failed to retrieve created appointment.")
    return created


# ─────────────────────────────────────────────────────────────────────────────
# 6. PUT /appointments/{id}/reschedule
# ─────────────────────────────────────────────────────────────────────────────
@router.put("/{id}/reschedule", response_model=AppointmentResponse)
async def reschedule_appointment(
    id: int,
    payload: AppointmentRescheduleRequest,
    conn: Connection = Depends(get_db),
    user: CurrentUser = Depends(require_roles("Receptionist")),
):
    """
    Reschedule an existing scheduled appointment to a new slot.
    Re-opens previous slot and books the new slot.
    """
    try:
        await conn.execute(
            "SELECT fn_reschedule_appointment($1, $2);",
            id,
            payload.new_slot_id,
        )
    except PostgresError as e:
        err_msg = str(e)
        if "does not exist" in err_msg:
            raise NotFoundError(err_msg)
        if "is no longer available" in err_msg:
            raise ConflictError("The selected new slot is no longer available.")
        if "only a Scheduled appointment can be rescheduled" in err_msg:
            raise ConflictError("Only Scheduled appointments can be rescheduled.")
        if "must belong to the same doctor" in err_msg:
            raise ConflictError("The new slot must belong to the same doctor as the appointment.")
        raise ConflictError(err_msg)

    updated = await _fetch_appointment_detail(conn, id)
    if not updated:
        raise NotFoundError("Appointment not found.")
    return updated


# ─────────────────────────────────────────────────────────────────────────────
# 7. PUT /appointments/{id}/cancel
# ─────────────────────────────────────────────────────────────────────────────
@router.put("/{id}/cancel", response_model=AppointmentResponse)
async def cancel_appointment(
    id: int,
    conn: Connection = Depends(get_db),
    user: CurrentUser = Depends(require_roles("Receptionist")),
):
    """
    Cancel a scheduled appointment and re-open its slot.
    """
    try:
        await conn.execute("SELECT fn_cancel_appointment($1);", id)
    except PostgresError as e:
        err_msg = str(e)
        if "does not exist" in err_msg:
            raise NotFoundError("Appointment not found.")
        if "only a Scheduled appointment can be cancelled" in err_msg:
            raise ConflictError("Only Scheduled appointments can be cancelled.")
        raise ConflictError(err_msg)

    cancelled = await _fetch_appointment_detail(conn, id)
    if not cancelled:
        raise NotFoundError("Appointment not found.")
    return cancelled
