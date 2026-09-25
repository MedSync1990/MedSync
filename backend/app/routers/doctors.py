from datetime import date
import secrets
import string
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from asyncpg import Connection

from app.dependencies import get_db, require_roles, get_branch_scope, CurrentUser
from app.schemas.doctors import (
    DoctorCreate,
    DoctorUpdate,
    DoctorSpecialtiesUpdate,
    DoctorResponse,
    DoctorCreateResponse,
)
from app.schemas.appointments import DoctorSlotResponse, SlotStatusEnum
from app.errors import NotFoundError, ConflictError, ForbiddenError, AppValidationError
from app.security import hash_password

router = APIRouter()


def generate_temp_password(length: int = 12) -> str:
    """Generate a secure random temporary password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


@router.get("", response_model=List[DoctorResponse])
async def list_doctors(
    specialty_id: Optional[int] = Query(None, description="Filter by specialty ID"),
    branch_id: Optional[int] = Query(None, description="Filter by branch ID"),
    conn: Connection = Depends(get_db),
    user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Doctor", "Receptionist")),
):
    """
    List doctors with their specialties, branch, and contact info.
    Branch Manager is strictly locked to their own branch.
    """
    scoped_branch_id = get_branch_scope(user) or branch_id

    query = """
        SELECT
            d.user_id AS doctor_id,
            TRIM(CONCAT(u.first_name, ' ', COALESCE(u.middle_name || ' ', ''), u.last_name)) AS full_name,
            u.id_number,
            COALESCE(
                ARRAY_AGG(DISTINCT c.phone_number) FILTER (WHERE c.phone_number IS NOT NULL),
                '{}'
            ) AS phone_numbers,
            u.email,
            s.branch_id,
            b.name AS branch_name,
            d.license_number,
            s.is_active,
            COALESCE(
                ARRAY_AGG(DISTINCT sp.name) FILTER (WHERE sp.name IS NOT NULL),
                '{}'
            ) AS specialties
        FROM doctor d
        JOIN staff s ON d.user_id = s.user_id
        JOIN app_user u ON d.user_id = u.user_id
        JOIN branch b ON s.branch_id = b.branch_id
        LEFT JOIN contact c ON u.user_id = c.user_id
        LEFT JOIN doctor_specialty ds ON d.user_id = ds.user_id
        LEFT JOIN specialty sp ON ds.specialty_id = sp.specialty_id
        WHERE ($1::int IS NULL OR s.branch_id = $1)
          AND (
              $2::int IS NULL OR 
              EXISTS (
                  SELECT 1 FROM doctor_specialty ds2 
                  WHERE ds2.user_id = d.user_id AND ds2.specialty_id = $2
              )
          )
        GROUP BY d.user_id, u.first_name, u.middle_name, u.last_name, u.id_number, u.email, s.branch_id, b.name, d.license_number, s.is_active
        ORDER BY full_name ASC;
    """

    rows = await conn.fetch(query, scoped_branch_id, specialty_id)
    return [
        DoctorResponse(
            doctor_id=r["doctor_id"],
            full_name=r["full_name"],
            id_number=r["id_number"],
            phone_numbers=list(r["phone_numbers"]),
            email=r["email"],
            branch_id=r["branch_id"],
            branch_name=r["branch_name"],
            license_number=r["license_number"],
            is_active=r["is_active"],
            specialties=list(r["specialties"]),
        )
        for r in rows
    ]


@router.get("/{id}", response_model=DoctorResponse)
async def get_doctor(
    id: int,
    conn: Connection = Depends(get_db),
    user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Doctor", "Receptionist")),
):
    """
    Get detailed profile for a specific doctor.
    BM gets 404 for a doctor outside their branch.
    """
    scoped_branch_id = get_branch_scope(user)

    query = """
        SELECT
            d.user_id AS doctor_id,
            TRIM(CONCAT(u.first_name, ' ', COALESCE(u.middle_name || ' ', ''), u.last_name)) AS full_name,
            u.id_number,
            COALESCE(
                ARRAY_AGG(DISTINCT c.phone_number) FILTER (WHERE c.phone_number IS NOT NULL),
                '{}'
            ) AS phone_numbers,
            u.email,
            s.branch_id,
            b.name AS branch_name,
            d.license_number,
            s.is_active,
            COALESCE(
                ARRAY_AGG(DISTINCT sp.name) FILTER (WHERE sp.name IS NOT NULL),
                '{}'
            ) AS specialties
        FROM doctor d
        JOIN staff s ON d.user_id = s.user_id
        JOIN app_user u ON d.user_id = u.user_id
        JOIN branch b ON s.branch_id = b.branch_id
        LEFT JOIN contact c ON u.user_id = c.user_id
        LEFT JOIN doctor_specialty ds ON d.user_id = ds.user_id
        LEFT JOIN specialty sp ON ds.specialty_id = sp.specialty_id
        WHERE d.user_id = $1
          AND ($2::int IS NULL OR s.branch_id = $2)
        GROUP BY d.user_id, u.first_name, u.middle_name, u.last_name, u.id_number, u.email, s.branch_id, b.name, d.license_number, s.is_active;
    """

    row = await conn.fetchrow(query, id, scoped_branch_id)
    if not row:
        raise NotFoundError("Doctor not found.")

    return DoctorResponse(
        doctor_id=row["doctor_id"],
        full_name=row["full_name"],
        id_number=row["id_number"],
        phone_numbers=list(row["phone_numbers"]),
        email=row["email"],
        branch_id=row["branch_id"],
        branch_name=row["branch_name"],
        license_number=row["license_number"],
        is_active=row["is_active"],
        specialties=list(row["specialties"]),
    )


@router.get("/{id}/availability", response_model=List[DoctorSlotResponse])
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


@router.post("", response_model=DoctorCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_doctor(
    payload: DoctorCreate,
    conn: Connection = Depends(get_db),
    user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager")),
):
    """
    Register a doctor.
    Creates app_user -> staff -> doctor -> doctor_specialty rows in a single transaction.
    BM is locked to their own branch.
    """
    # Enforce Branch Manager branch lock
    scoped_branch_id = get_branch_scope(user)
    if scoped_branch_id is not None and payload.branch_id != scoped_branch_id:
        raise ForbiddenError("Branch Managers can only register doctors for their own branch.")

    # Check if branch exists
    branch = await conn.fetchrow("SELECT name FROM branch WHERE branch_id = $1;", payload.branch_id)
    if not branch:
        raise NotFoundError(f"Branch ID {payload.branch_id} does not exist.")

    # Check if NIC or License already exists
    existing_nic = await conn.fetchrow("SELECT user_id FROM app_user WHERE id_number = $1;", payload.id_number)
    if existing_nic:
        raise ConflictError("A user with this NIC already exists.")

    existing_license = await conn.fetchrow("SELECT user_id FROM doctor WHERE license_number = $1;", payload.license_number)
    if existing_license:
        raise ConflictError(f"Doctor with license number '{payload.license_number}' already exists.")

    # Validate that all requested specialties exist
    specialty_rows = await conn.fetch(
        "SELECT specialty_id, name FROM specialty WHERE specialty_id = ANY($1::int[]);",
        payload.specialty_ids
    )
    if len(specialty_rows) != len(set(payload.specialty_ids)):
        raise AppValidationError([{"field": "specialty_ids", "message": "One or more specialty IDs are invalid."}])

    # Get Doctor role_id
    role_row = await conn.fetchrow("SELECT role_id FROM role WHERE name = 'Doctor';")
    if not role_row:
        raise NotFoundError("Doctor role not configured in database.")
    role_id = role_row["role_id"]

    # Generate credentials
    temp_password = generate_temp_password()
    hashed_pwd = hash_password(temp_password)
    # Generate unique username
    base_username = f"dr.{payload.last_name.lower().replace(' ', '')}"
    username = base_username
    suffix = 1
    while await conn.fetchval("SELECT 1 FROM staff WHERE username = $1;", username):
        username = f"{base_username}{suffix}"
        suffix += 1

    async with conn.transaction():
        # 1. Insert into app_user
        app_user_query = """
            INSERT INTO app_user (
                role_id, first_name, middle_name, last_name,
                id_number, address, birthdate, gender, marital_status, email
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING user_id;
        """
        user_id = await conn.fetchval(
            app_user_query,
            role_id,
            payload.first_name,
            payload.middle_name,
            payload.last_name,
            payload.id_number,
            payload.address,
            payload.birthdate,
            payload.gender.value,
            payload.marital_status,
            payload.email,
        )

        # 2. Insert contact numbers
        for phone in set(payload.phone_numbers):
            await conn.execute(
                "INSERT INTO contact (user_id, phone_number) VALUES ($1, $2);",
                user_id, phone
            )

        # 3. Insert staff
        staff_query = """
            INSERT INTO staff (user_id, branch_id, username, password_hash, is_active)
            VALUES ($1, $2, $3, $4, TRUE);
        """
        await conn.execute(staff_query, user_id, payload.branch_id, username, hashed_pwd)

        # 4. Insert doctor
        await conn.execute(
            "INSERT INTO doctor (user_id, license_number) VALUES ($1, $2);",
            user_id, payload.license_number
        )

        # 5. Insert specialties
        for sp_id in set(payload.specialty_ids):
            await conn.execute(
                "INSERT INTO doctor_specialty (user_id, specialty_id) VALUES ($1, $2);",
                user_id, sp_id
            )

    full_name = f"{payload.first_name} {payload.middle_name + ' ' if payload.middle_name else ''}{payload.last_name}".strip()

    return DoctorCreateResponse(
        doctor_id=user_id,
        full_name=full_name,
        id_number=payload.id_number,
        phone_numbers=payload.phone_numbers,
        email=payload.email,
        branch_id=payload.branch_id,
        branch_name=branch["name"],
        license_number=payload.license_number,
        is_active=True,
        specialties=[r["name"] for r in specialty_rows],
        temp_password=temp_password,
    )


@router.put("/{id}", response_model=DoctorResponse)
async def update_doctor(
    id: int,
    payload: DoctorUpdate,
    conn: Connection = Depends(get_db),
    user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager")),
):
    """
    Update doctor license number.
    BM scoped to own branch.
    """
    scoped_branch_id = get_branch_scope(user)
    doctor_row = await conn.fetchrow(
        "SELECT s.branch_id FROM doctor d JOIN staff s ON d.user_id = s.user_id WHERE d.user_id = $1;",
        id
    )
    if not doctor_row:
        raise NotFoundError("Doctor not found.")

    if scoped_branch_id is not None and doctor_row["branch_id"] != scoped_branch_id:
        raise NotFoundError("Doctor not found.")

    # Check license conflict
    conflict = await conn.fetchval(
        "SELECT user_id FROM doctor WHERE license_number = $1 AND user_id <> $2;",
        payload.license_number, id
    )
    if conflict:
        raise ConflictError(f"License number '{payload.license_number}' is already assigned to another doctor.")

    await conn.execute(
        "UPDATE doctor SET license_number = $1 WHERE user_id = $2;",
        payload.license_number, id
    )

    return await get_doctor(id=id, conn=conn, user=user)


@router.put("/{id}/specialties", response_model=DoctorResponse)
async def update_doctor_specialties(
    id: int,
    payload: DoctorSpecialtiesUpdate,
    conn: Connection = Depends(get_db),
    user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager")),
):
    """
    Add or remove specialties for a doctor. Doctor must retain at least one specialty.
    BM scoped to own branch.
    """
    scoped_branch_id = get_branch_scope(user)
    doctor_row = await conn.fetchrow(
        "SELECT s.branch_id FROM doctor d JOIN staff s ON d.user_id = s.user_id WHERE d.user_id = $1;",
        id
    )
    if not doctor_row:
        raise NotFoundError("Doctor not found.")

    if scoped_branch_id is not None and doctor_row["branch_id"] != scoped_branch_id:
        raise NotFoundError("Doctor not found.")

    async with conn.transaction():
        # Current specialties
        current_rows = await conn.fetch(
            "SELECT specialty_id FROM doctor_specialty WHERE user_id = $1;",
            id
        )
        current_ids = set(r["specialty_id"] for r in current_rows)

        # Apply removals
        ids_to_remove = set(payload.remove)
        remaining_ids = current_ids - ids_to_remove

        # Apply additions
        ids_to_add = set(payload.add)
        new_total_ids = remaining_ids | ids_to_add

        if len(new_total_ids) < 1:
            raise ConflictError("A doctor must retain at least one specialty.")

        # Remove requested
        if ids_to_remove:
            await conn.execute(
                "DELETE FROM doctor_specialty WHERE user_id = $1 AND specialty_id = ANY($2::int[]);",
                id, list(ids_to_remove)
            )

        # Add requested
        for sp_id in ids_to_add:
            await conn.execute(
                """
                INSERT INTO doctor_specialty (user_id, specialty_id)
                VALUES ($1, $2)
                ON CONFLICT (user_id, specialty_id) DO NOTHING;
                """,
                id, sp_id
            )

    return await get_doctor(id=id, conn=conn, user=user)