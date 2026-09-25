from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from asyncpg import Connection

from app.db import get_conn
from app.dependencies import CurrentUser, require_roles
from app.errors import AppValidationError, NotFoundError
from app.schemas.allergies import PatientAllergiesUpdateRequest
from app.schemas.patients import (
    PatientCreateRequest,
    PatientUpdateRequest,
    PatientResponse,
    PatientListItem,
    PatientListResponse,
    PatientAllergyItem,
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

        # 5. Insert patient allergies if provided
        if payload.allergy_ids:
            for aid in payload.allergy_ids:
                await conn.execute(
                    """
                    INSERT INTO patient_allergy (patient_id, allergy_id)
                    VALUES ($1, $2)
                    ON CONFLICT DO NOTHING
                    """,
                    user_id,
                    aid,
                )

    return await get_patient(str(user_id), conn)


@router.get(
    "",
    response_model=PatientListResponse,
    dependencies=[Depends(require_roles("Administrator", "Branch Manager", "Receptionist", "Doctor"))],
)
async def list_patients(
    search: Optional[str] = Query(None, description="Search by NIC, name, or phone (FR-PM-04)"),
    branch: Optional[str] = Query(None, description="Filter by branch ('all', 'colombo', 'kandy', 'galle', or ID)"),
    insurance: Optional[str] = Query(None, description="Filter by insurance status ('all', 'yes', 'no')"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    conn: Connection = Depends(get_conn),
):
    """
    Search / list patients across all branches (FR-PM-04, FR-PM-06) with branch and insurance filtering.
    """
    offset = (page - 1) * limit
    search_term = f"%{search.strip()}%" if search and search.strip() else None

    clean_branch = None
    if branch and branch.strip().lower() != "all":
        b_val = branch.strip().lower()
        if b_val == "colombo":
            clean_branch = "Colombo"
        elif b_val == "kandy":
            clean_branch = "Kandy"
        elif b_val == "galle":
            clean_branch = "Galle"
        else:
            clean_branch = branch.strip()

    clean_insurance = None
    if insurance and insurance.strip().lower() != "all":
        clean_insurance = insurance.strip().lower()

    count_query = """
        SELECT COUNT(DISTINCT p.user_id)
        FROM patient p
        JOIN app_user u ON p.user_id = u.user_id
        LEFT JOIN branch b ON p.registered_branch = b.branch_id
        LEFT JOIN contact c ON u.user_id = c.user_id
        WHERE ($1::text IS NULL
           OR u.id_number ILIKE $1
           OR (u.first_name || ' ' || u.last_name) ILIKE $1
           OR p.patient_code ILIKE $1
           OR c.phone_number ILIKE $1)
          AND ($2::text IS NULL
           OR b.name ILIKE ('%' || $2 || '%')
           OR p.registered_branch::text = $2)
          AND ($3::text IS NULL
           OR ($3 IN ('yes', 'insured') AND EXISTS(
               SELECT 1 FROM patient_insurance pi 
               WHERE pi.patient_id = p.user_id 
                 AND pi.is_active = TRUE 
                 AND CURRENT_DATE BETWEEN pi.start_date AND pi.end_date
           ))
           OR ($3 IN ('no', 'self-pay') AND NOT EXISTS(
               SELECT 1 FROM patient_insurance pi 
               WHERE pi.patient_id = p.user_id 
                 AND pi.is_active = TRUE 
                 AND CURRENT_DATE BETWEEN pi.start_date AND pi.end_date
           )))
    """
    total = await conn.fetchval(count_query, search_term, clean_branch, clean_insurance) or 0

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
            b.name AS branch_name,
            EXISTS(
                SELECT 1 FROM patient_insurance pi 
                WHERE pi.patient_id = p.user_id 
                  AND pi.is_active = TRUE 
                  AND CURRENT_DATE BETWEEN pi.start_date AND pi.end_date
            ) AS has_insurance,
            p.is_active
        FROM patient p
        JOIN app_user u ON p.user_id = u.user_id
        LEFT JOIN branch b ON p.registered_branch = b.branch_id
        LEFT JOIN contact c ON u.user_id = c.user_id
        WHERE ($1::text IS NULL
           OR u.id_number ILIKE $1
           OR (u.first_name || ' ' || u.last_name) ILIKE $1
           OR p.patient_code ILIKE $1
           OR c.phone_number ILIKE $1)
          AND ($2::text IS NULL
           OR b.name ILIKE ('%' || $2 || '%')
           OR p.registered_branch::text = $2)
          AND ($3::text IS NULL
           OR ($3 IN ('yes', 'insured') AND EXISTS(
               SELECT 1 FROM patient_insurance pi 
               WHERE pi.patient_id = p.user_id 
                 AND pi.is_active = TRUE 
                 AND CURRENT_DATE BETWEEN pi.start_date AND pi.end_date
           ))
           OR ($3 IN ('no', 'self-pay') AND NOT EXISTS(
               SELECT 1 FROM patient_insurance pi 
               WHERE pi.patient_id = p.user_id 
                 AND pi.is_active = TRUE 
                 AND CURRENT_DATE BETWEEN pi.start_date AND pi.end_date
           )))
        GROUP BY p.user_id, p.patient_code, u.first_name, u.last_name, u.id_number, u.gender, u.birthdate, p.registered_branch, b.name, p.is_active
        ORDER BY p.user_id DESC
        LIMIT $4 OFFSET $5
    """
    rows = await conn.fetch(data_query, search_term, clean_branch, clean_insurance, limit, offset)

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
            branch_name=r["branch_name"] or ("Colombo Central Branch" if r["registered_branch"] == 1 else f"Branch {r['registered_branch']}"),
            has_insurance=bool(r["has_insurance"]),
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
            b.name AS branch_name,
            EXISTS(
                SELECT 1 FROM patient_insurance pi 
                WHERE pi.patient_id = p.user_id 
                  AND pi.is_active = TRUE 
                  AND CURRENT_DATE BETWEEN pi.start_date AND pi.end_date
            ) AS has_insurance,
            p.registered_date::text AS registered_date,
            p.is_active
        FROM patient p
        JOIN app_user u ON p.user_id = u.user_id
        LEFT JOIN branch b ON p.registered_branch = b.branch_id
        WHERE ($1::boolean AND p.user_id = $2::int)
           OR UPPER(p.patient_code) = UPPER($3::text)
           OR UPPER(u.id_number) = UPPER($3::text)
        LIMIT 1
    """
    row = await conn.fetchrow(query, is_num, num_val, identifier)
    if not row:
        raise NotFoundError("Patient not found.")

    allergies_rows = await conn.fetch(
        """
        SELECT a.allergy_id, a.allergy_code, a.name
        FROM allergy a
        JOIN patient_allergy pa ON a.allergy_id = pa.allergy_id
        WHERE pa.patient_id = $1
        ORDER BY a.name ASC
        """,
        row["patient_id"],
    )
    allergies = [
        PatientAllergyItem(
            allergy_id=ar["allergy_id"],
            allergy_code=ar["allergy_code"],
            name=ar["name"],
        )
        for ar in allergies_rows
    ]

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
        branch_name=row["branch_name"] or ("Colombo Central Branch" if row["registered_branch"] == 1 else None),
        has_insurance=bool(row["has_insurance"]),
        registered_date=row["registered_date"],
        is_active=row["is_active"],
        allergies=allergies,
    )


@router.put(
    "/{identifier}",
    response_model=PatientResponse,
    dependencies=[Depends(require_roles("Receptionist", "Administrator", "Branch Manager"))],
)
async def update_patient(
    identifier: str,
    payload: PatientUpdateRequest,
    conn: Connection = Depends(get_conn),
):
    """
    Update patient details (personal, contact, emergency contact).
    Preserves historical appointments, treatments, and billing (FR-PM-05).
    """
    is_num = identifier.isdigit()
    num_val = int(identifier) if is_num and int(identifier) <= 2147483647 else 0

    patient_id = await conn.fetchval(
        """
        SELECT p.user_id
        FROM patient p
        JOIN app_user u ON p.user_id = u.user_id
        WHERE ($1::boolean AND p.user_id = $2::int)
           OR UPPER(p.patient_code) = UPPER($3::text)
           OR UPPER(u.id_number) = UPPER($3::text)
        LIMIT 1
        """,
        is_num,
        num_val,
        identifier,
    )
    if not patient_id:
        raise NotFoundError("Patient not found.")

    async with conn.transaction():
        # 1. Update app_user fields
        user_updates = []
        user_params = [patient_id]
        if payload.first_name is not None:
            user_params.append(payload.first_name.strip())
            user_updates.append(f"first_name = ${len(user_params)}")
        if payload.middle_name is not None:
            user_params.append(payload.middle_name.strip() if payload.middle_name else None)
            user_updates.append(f"middle_name = ${len(user_params)}")
        if payload.last_name is not None:
            user_params.append(payload.last_name.strip())
            user_updates.append(f"last_name = ${len(user_params)}")
        if payload.address is not None:
            user_params.append(payload.address.strip())
            user_updates.append(f"address = ${len(user_params)}")
        if payload.email is not None:
            user_params.append(payload.email.strip() if payload.email else None)
            user_updates.append(f"email = ${len(user_params)}")

        if user_updates:
            update_sql = f"UPDATE app_user SET {', '.join(user_updates)} WHERE user_id = $1"
            await conn.execute(update_sql, *user_params)

        # 2. Update contact phone number
        phone = payload.phone_number or (payload.phone_numbers[0] if payload.phone_numbers else None)
        if phone:
            digits = "".join(filter(str.isdigit, phone))
            if len(digits) == 11 and digits.startswith("94"):
                digits = "0" + digits[2:]
            elif len(digits) == 9:
                digits = "0" + digits
            if len(digits) == 10:
                # Update existing or insert
                existing_contact = await conn.fetchval(
                    "SELECT contact_id FROM contact WHERE user_id = $1 LIMIT 1",
                    patient_id,
                )
                if existing_contact:
                    await conn.execute(
                        "UPDATE contact SET phone_number = $1 WHERE contact_id = $2",
                        digits,
                        existing_contact,
                    )
                else:
                    await conn.execute(
                        "INSERT INTO contact (user_id, phone_number) VALUES ($1, $2)",
                        patient_id,
                        digits,
                    )

        # 3. Update patient fields
        pt_updates = []
        pt_params = [patient_id]
        if payload.blood_group is not None:
            pt_params.append(payload.blood_group.strip() if payload.blood_group else None)
            pt_updates.append(f"blood_group = ${len(pt_params)}")
        em_phone = payload.emergency_contact or payload.emergency_contact_phone
        if em_phone is not None:
            digits = "".join(filter(str.isdigit, em_phone))
            if len(digits) == 11 and digits.startswith("94"):
                digits = "0" + digits[2:]
            elif len(digits) == 9:
                digits = "0" + digits
            val = digits if len(digits) == 10 else None
            pt_params.append(val)
            pt_updates.append(f"emergency_contact = ${len(pt_params)}")
        c_name = payload.contact_name or payload.emergency_contact_name
        if c_name is not None:
            pt_params.append(c_name.strip() if c_name else None)
            pt_updates.append(f"contact_name = ${len(pt_params)}")

        if pt_updates:
            update_sql = f"UPDATE patient SET {', '.join(pt_updates)} WHERE user_id = $1"
            await conn.execute(update_sql, *pt_params)

        # 4. Update allergies if provided
        if payload.allergy_ids is not None:
            await conn.execute(
                "DELETE FROM patient_allergy WHERE patient_id = $1",
                patient_id,
            )
            for aid in payload.allergy_ids:
                await conn.execute(
                    """
                    INSERT INTO patient_allergy (patient_id, allergy_id)
                    VALUES ($1, $2)
                    ON CONFLICT DO NOTHING
                    """,
                    patient_id,
                    aid,
                )

    return await get_patient(str(patient_id), conn)


@router.get(
    "/{identifier}/allergies",
    response_model=List[PatientAllergyItem],
    dependencies=[Depends(require_roles("Administrator", "Branch Manager", "Receptionist", "Doctor"))],
    summary="Get patient's active allergies",
)
async def get_patient_allergies(
    identifier: str,
    conn: Connection = Depends(get_conn),
):
    """
    Returns list of assigned allergies for a patient (FR-CTM, api-routes.md §4).
    """
    is_num = identifier.isdigit()
    num_val = int(identifier) if is_num and int(identifier) <= 2147483647 else 0
    patient_id = await conn.fetchval(
        """
        SELECT p.user_id FROM patient p
        JOIN app_user u ON p.user_id = u.user_id
        WHERE ($1::boolean AND p.user_id = $2::int)
           OR UPPER(p.patient_code) = UPPER($3::text)
           OR UPPER(u.id_number) = UPPER($3::text)
        LIMIT 1
        """,
        is_num,
        num_val,
        identifier,
    )
    if not patient_id:
        raise NotFoundError("Patient not found.")

    rows = await conn.fetch(
        """
        SELECT a.allergy_id, a.allergy_code, a.name
        FROM allergy a
        JOIN patient_allergy pa ON a.allergy_id = pa.allergy_id
        WHERE pa.patient_id = $1
        ORDER BY a.name ASC
        """,
        patient_id,
    )
    return [
        PatientAllergyItem(
            allergy_id=r["allergy_id"],
            allergy_code=r["allergy_code"],
            name=r["name"],
        )
        for r in rows
    ]


@router.put(
    "/{identifier}/allergies",
    response_model=List[PatientAllergyItem],
    dependencies=[Depends(require_roles("Receptionist", "Administrator", "Branch Manager"))],
    summary="Replace patient's assigned allergies",
)
async def update_patient_allergies(
    identifier: str,
    payload: PatientAllergiesUpdateRequest,
    conn: Connection = Depends(get_conn),
):
    """
    Replaces patient's assigned allergy set (add/remove in one call).
    """
    is_num = identifier.isdigit()
    num_val = int(identifier) if is_num and int(identifier) <= 2147483647 else 0
    patient_id = await conn.fetchval(
        """
        SELECT p.user_id FROM patient p
        JOIN app_user u ON p.user_id = u.user_id
        WHERE ($1::boolean AND p.user_id = $2::int)
           OR UPPER(p.patient_code) = UPPER($3::text)
           OR UPPER(u.id_number) = UPPER($3::text)
        LIMIT 1
        """,
        is_num,
        num_val,
        identifier,
    )
    if not patient_id:
        raise NotFoundError("Patient not found.")

    async with conn.transaction():
        await conn.execute("DELETE FROM patient_allergy WHERE patient_id = $1", patient_id)
        for aid in payload.allergy_ids:
            await conn.execute(
                """
                INSERT INTO patient_allergy (patient_id, allergy_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
                """,
                patient_id,
                aid,
            )

    rows = await conn.fetch(
        """
        SELECT a.allergy_id, a.allergy_code, a.name
        FROM allergy a
        JOIN patient_allergy pa ON a.allergy_id = pa.allergy_id
        WHERE pa.patient_id = $1
        ORDER BY a.name ASC
        """,
        patient_id,
    )
    return [
        PatientAllergyItem(
            allergy_id=r["allergy_id"],
            allergy_code=r["allergy_code"],
            name=r["name"],
        )
        for r in rows
    ]

