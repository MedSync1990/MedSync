from fastapi import APIRouter, Depends, Path
from asyncpg import Connection
from app.db import get_conn
from app.dependencies import CurrentUser, require_roles
from app.schemas.insurance import (
    VerifyInsuranceRequest,
    VerifyInsuranceResponse,
    PatientInsuranceItem,
    PatientInsuranceResponse,
    InsurancePolicyItem,
    InsurancePolicyListResponse
)
from app.errors import NotFoundError, AppValidationError


router = APIRouter()

@router.get("/policies", response_model=InsurancePolicyListResponse)
async def get_insurance_policies(
    current_user: CurrentUser = Depends(
        require_roles("Administrator", "Branch Manager", "Receptionist", "Doctor")
    ),
    conn: Connection = Depends(get_conn),
):
    """
    GET /insurance/policies — returns the hospital's insurance policy catalogue.
    """
    rows = await conn.fetch("SELECT policy_id, provider_name, policy_name FROM insurance_policy_details ORDER BY provider_name ASC, policy_name ASC")
    items = [
        InsurancePolicyItem(
            policy_id=r["policy_id"],
            provider_name=r["provider_name"],
            policy_name=r["policy_name"],
        )
        for r in rows
    ]
    return InsurancePolicyListResponse(data=items)


@router.get("/patient/{patient_id}", response_model=PatientInsuranceResponse)
async def get_patient_insurance(
    patient_id: int = Path(..., description="Patient User ID"),
    current_user: CurrentUser = Depends(
        require_roles("Administrator", "Branch Manager", "Receptionist", "Doctor")
    ),
    conn: Connection = Depends(get_conn),
):
    """
    GET /patients/{id}/insurance — returns the patient's insurance policies
    with active status derived from date range (api-routes.md §9).
    """

    # Verify the patient exists
    patient = await conn.fetchrow(
        "SELECT user_id FROM patient WHERE user_id = $1", patient_id
    )
    if not patient:
        raise NotFoundError(f"Patient with ID {patient_id} not found.")

    query = """
        SELECT
            pi.insurance_id,
            pi.policy_id,
            ipd.provider_name,
            ipd.policy_name,
            pi.insurance_card_number,
            pi.start_date,
            pi.end_date,
            (CURRENT_DATE BETWEEN pi.start_date AND pi.end_date) AS is_active
        FROM patient_insurance pi
        JOIN insurance_policy_details ipd ON pi.policy_id = ipd.policy_id
        WHERE pi.patient_id = $1
        ORDER BY pi.end_date DESC
    """
    rows = await conn.fetch(query, patient_id)

    items = [
        PatientInsuranceItem(
            insurance_id=r["insurance_id"],
            policy_id=r["policy_id"],
            provider_name=r["provider_name"],
            policy_name=r["policy_name"],
            insurance_card_number=r["insurance_card_number"],
            start_date=r["start_date"],
            end_date=r["end_date"],
            is_active=r["is_active"],
        )
        for r in rows
    ]

    return PatientInsuranceResponse(data=items)


@router.post("/verify", response_model=VerifyInsuranceResponse)
async def verify_and_link_insurance(
    payload: VerifyInsuranceRequest,
    current_user: CurrentUser = Depends(
        require_roles("Administrator", "Branch Manager", "Receptionist")
    ),
    conn: Connection = Depends(get_conn),
):
    """
    POST /insurance/verify — verify that the policy exists in the hospital
    catalogue, validate dates, and link the patient to that policy
    (api-routes.md §9 / FR-IM-01–06).
    """

    # 1. Verify the policy actually exists in the hospital's catalogue
    policy = await conn.fetchrow(
        "SELECT policy_id FROM insurance_policy_details WHERE policy_id = $1",
        payload.policy_id,
    )
    if not policy:
        raise NotFoundError("Insurance policy not found in hospital catalogue.")

    # 2. Verify the patient exists
    patient = await conn.fetchrow(
        "SELECT user_id FROM patient WHERE user_id = $1",
        payload.patient_id,
    )
    if not patient:
        raise NotFoundError(f"Patient with ID {payload.patient_id} not found.")

    # 3. Validate date range
    if payload.end_date <= payload.start_date:
        raise AppValidationError(
            [{"field": "end_date", "message": "End date must be after start date."}]
        )

    # 4. Insert the record to link the patient with the insurance policy
    new_id = await conn.fetchval(
        """INSERT INTO patient_insurance
               (patient_id, policy_id, insurance_card_number, start_date, end_date)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING insurance_id
        """,
        payload.patient_id,
        payload.policy_id,
        payload.insurance_card_number,
        payload.start_date,
        payload.end_date,
    )

    return VerifyInsuranceResponse(
        message="Insurance policy verified and linked successfully.",
        insurance_id=new_id,
        patient_id=payload.patient_id,
        policy_id=payload.policy_id,
        insurance_card_number=payload.insurance_card_number,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )
