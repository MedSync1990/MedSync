# backend/app/routers/patients.py
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from asyncpg import Connection

from app.db import get_conn
from app.dependencies import CurrentUser, require_roles
from app.errors import AppValidationError, NotFoundError
from app.schemas.patients import (
    PatientCreateRequest,
    PatientResponse,
    PatientListItem,
    PatientListResponse,
)

router = APIRouter()


@router.post(
    "",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("Receptionist", "Administrator"))],
)
async def register_patient(
    payload: PatientCreateRequest,
    current_user: CurrentUser = Depends(require_roles("Receptionist", "Administrator")),
    conn: Connection = Depends(get_conn),
):
    """
    Register a new patient across island branches (FR-PM-01, FR-PM-02, FR-PM-03, FR-PM-07).
    Atomically writes to app_user, contact, patient, and patient_insurance.
    """
    nic = payload.id_number.strip().upper()

    # 1. Reject duplicate NICs (FR-PM-02, api-routes.md §4.1 step 4)
    existing_nic = await conn.fetchval(
        "SELECT 1 FROM app_user WHERE UPPER(id_number) = $1",
        nic,
    )
    if existing_nic:
        raise AppValidationError([
            {"field": "id_number", "message": "A patient with this NIC already exists."}
        ])

    # 2. Resolve 'Patient' role ID
    role_id = await conn.fetchval(
        "SELECT role_id FROM role WHERE LOWER(role_name) = 'patient' LIMIT 1"
    )
    if not role_id:
        role_id = 5  # Standard seed role_id for Patient

    # 3. Determine registering branch (caller's branch takes precedence)
    branch_id = current_user.branch_id or payload.registered_branch or 1

    birthdate = payload.resolved_birthdate
    phones = payload.resolved_phones
    emergency_phone = payload.resolved_emergency_phone
    contact_name = payload.resolved_contact_name

    # 4. Atomic transaction across app_user -> contact -> patient -> patient_insurance
    async with conn.transaction():
        # A. Insert into app_user
        user_id = await conn.fetchval(
            """
            INSERT INTO app_user (
                role_id, first_name, middle_name, last_name,
                id_number, address, birthdate, gender, email
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8::gender_enum, $9
            )
            RETURNING user_id
            """,
            role_id,
            payload.first_name.strip(),
            payload.middle_name.strip() if payload.middle_name else None,
            payload.last_name.strip(),
            nic,
            payload.address.strip(),
            birthdate,
            payload.gender,
            payload.email.strip() if payload.email else None,
        )

        # B. Insert contact phone numbers
        for phone in phones:
            await conn.execute(
                """
                INSERT INTO contact (user_id, phone_number)
                VALUES ($1, $2)
                """,
                user_id,
                phone,
            )

        # C. Insert into patient table (patient_code is generated automatically as PT-xxxxxx)
        patient_code = await conn.fetchval(
            """
            INSERT INTO patient (
                user_id, blood_group, emergency_contact, contact_name,
                registered_branch, registered_date, is_active
            ) VALUES (
                $1, $2, $3, $4, $5, CURRENT_DATE, TRUE
            )
            RETURNING patient_code
            """,
            user_id,
            payload.blood_group.strip() if payload.blood_group else None,
            emergency_phone,
            contact_name,
            branch_id,
        )

        # D. Optional: Insert health insurance if provided
        if payload.insurance and payload.insurance.insurance_card_number:
            ins = payload.insurance
            provider_name = ins.provider_name.strip()
            card_number = ins.insurance_card_number.strip()

            policy_id = await conn.fetchval(
                "SELECT policy_id FROM insurance_policy_details WHERE provider_name = $1 LIMIT 1",
                provider_name,
            )
            if not policy_id:
                policy_id = await conn.fetchval(
                    """
                    INSERT INTO insurance_policy_details (provider_name, policy_name)
                    VALUES ($1, $2)
                    RETURNING policy_id
                    """,
                    provider_name,
                    f"{provider_name} Health Cover",
                )

            start_d = ins.start_date or date.today()
            end_d = ins.end_date or date(start_d.year + 2, 12, 31)
            if end_d <= start_d:
                end_d = date(start_d.year + 1, start_d.month, start_d.day)

            await conn.execute(
                """
                INSERT INTO patient_insurance (
                    patient_id, policy_id, insurance_card_number,
                    start_date, end_date, is_active
                ) VALUES ($1, $2, $3, $4, $5, TRUE)
                """,
                user_id,
                policy_id,
                card_number,
                start_d,
                end_d,
            )

    primary_phone = phones[0] if phones else (emergency_phone or "")

    return PatientResponse(
        patient_id=user_id,
        patient_code=patient_code or f"PT-{str(user_id).zfill(6)}",
        first_name=payload.first_name.strip(),
        middle_name=payload.middle_name.strip() if payload.middle_name else None,
        last_name=payload.last_name.strip(),
        id_number=nic,
        phone_number=primary_phone,
        email=payload.email,
        date_of_birth=str(birthdate),
        gender=payload.gender,
        address=payload.address.strip(),
        blood_group=payload.blood_group,
        emergency_contact=emergency_phone,
        contact_name=contact_name,
        registered_branch=branch_id,
        registered_date=str(date.today()),
        is_active=True,
    )


@router.get(
    "",
    response_model=PatientListResponse,
    dependencies=[Depends(require_roles("Administrator", "Branch Manager", "Receptionist", "Doctor"))],
)
async def list_patients(
    search: Optional[str] = Query(None, description="Search by NIC, name, or phone (FR-PM-04)"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    conn: Connection = Depends(get_conn),
):
    """
    Search / list patients across all branches (FR-PM-04, FR-PM-06).
    """
    offset = (page - 1) * limit
    search_term = f"%{search.strip()}%" if search and search.strip() else None

    count_query = """
        SELECT COUNT(DISTINCT p.user_id)
        FROM patient p
        JOIN app_user u ON p.user_id = u.user_id
        LEFT JOIN contact c ON u.user_id = c.user_id
        WHERE ($1::text IS NULL
           OR u.id_number ILIKE $1
           OR (u.first_name || ' ' || u.last_name) ILIKE $1
           OR p.patient_code ILIKE $1
           OR c.phone_number ILIKE $1)
    """
    total = await conn.fetchval(count_query, search_term) or 0

    data_query = """
        SELECT 
            p.user_id AS patient_id,
            p.patient_code,
            u.first_name,
            u.last_name,
            u.id_number,
            COALESCE((SELECT phone_number FROM contact WHERE user_id = u.user_id LIMIT 1), '') AS phone_number,
            u.gender::text AS gender,
            u.birthdate::text AS date_of_birth,
            p.registered_branch,
            p.is_active
        FROM patient p
        JOIN app_user u ON p.user_id = u.user_id
        LEFT JOIN contact c ON u.user_id = c.user_id
        WHERE ($1::text IS NULL
           OR u.id_number ILIKE $1
           OR (u.first_name || ' ' || u.last_name) ILIKE $1
           OR p.patient_code ILIKE $1
           OR c.phone_number ILIKE $1)
        GROUP BY p.user_id, p.patient_code, u.first_name, u.last_name, u.id_number, u.gender, u.birthdate, p.registered_branch, p.is_active
        ORDER BY p.user_id DESC
        LIMIT $2 OFFSET $3
    """
    rows = await conn.fetch(data_query, search_term, limit, offset)

    items = [
        PatientListItem(
            patient_id=r["patient_id"],
            patient_code=r["patient_code"],
            first_name=r["first_name"],
            last_name=r["last_name"],
            id_number=r["id_number"],
            phone_number=r["phone_number"],
            gender=r["gender"],
            date_of_birth=r["date_of_birth"],
            registered_branch=r["registered_branch"],
            is_active=r["is_active"],
        )
        for r in rows
    ]

    return PatientListResponse(data=items, total=total, page=page, limit=limit)


@router.get(
    "/{identifier}",
    response_model=PatientResponse,
    dependencies=[Depends(require_roles("Administrator", "Branch Manager", "Receptionist", "Doctor"))],
)
async def get_patient(
    identifier: str,
    conn: Connection = Depends(get_conn),
):
    """
    Get a single patient profile by patient_id, patient_code (PT-xxxxxx), or NIC.
    """
    is_num = identifier.isdigit()
    num_val = int(identifier) if is_num and int(identifier) <= 2147483647 else 0

    query = """
        SELECT 
            p.user_id AS patient_id,
            p.patient_code,
            u.first_name,
            u.middle_name,
            u.last_name,
            u.id_number,
            COALESCE((SELECT phone_number FROM contact WHERE user_id = u.user_id LIMIT 1), '') AS phone_number,
            u.email,
            u.birthdate::text AS date_of_birth,
            u.gender::text AS gender,
            u.address,
            p.blood_group,
            p.emergency_contact,
            p.contact_name,
            p.registered_branch,
            p.registered_date::text AS registered_date,
            p.is_active
        FROM patient p
        JOIN app_user u ON p.user_id = u.user_id
        WHERE ($1::boolean AND p.user_id = $2::int)
           OR UPPER(p.patient_code) = UPPER($3::text)
           OR UPPER(u.id_number) = UPPER($3::text)
        LIMIT 1
    """
    row = await conn.fetchrow(query, is_num, num_val, identifier)
    if not row:
        raise NotFoundError("Patient not found.")

    return PatientResponse(
        patient_id=row["patient_id"],
        patient_code=row["patient_code"],
        first_name=row["first_name"],
        middle_name=row["middle_name"],
        last_name=row["last_name"],
        id_number=row["id_number"],
        phone_number=row["phone_number"],
        email=row["email"],
        date_of_birth=row["date_of_birth"],
        gender=row["gender"],
        address=row["address"],
        blood_group=row["blood_group"],
        emergency_contact=row["emergency_contact"],
        contact_name=row["contact_name"],
        registered_branch=row["registered_branch"],
        registered_date=row["registered_date"],
        is_active=row["is_active"],
    )
