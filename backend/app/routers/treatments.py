from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from asyncpg import Connection

from app.db import get_conn
from app.dependencies import require_roles
from app.errors import NotFoundError, ConflictError
from app.schemas.treatments import (
    TreatmentResponse,
    TreatmentCreateRequest,
    TreatmentUpdateRequest,
)

router = APIRouter()


@router.get(
    "",
    response_model=List[TreatmentResponse],
    summary="List treatment catalogue items",
)
async def list_treatments(
    category: Optional[str] = Query(None, description="Filter by category (e.g. Consultation, Diagnostic, Laboratory)"),
    search: Optional[str] = Query(None, description="Search by name or category"),
    active_only: bool = Query(True, description="Filter to active catalogue entries only"),
    conn: Connection = Depends(get_conn),
):
    """
    Returns reference list of available treatments and prices (FR-TCM-01).
    Used by Doctor Consultation treatment picker and Treatment Catalogue pages.
    """
    conditions = []
    params = []

    if active_only:
        conditions.append("is_active = TRUE")

    if category and category.strip().lower() != "all":
        params.append(category.strip())
        conditions.append(f"LOWER(category) = LOWER(${len(params)})")

    if search and search.strip():
        params.append(f"%{search.strip()}%")
        conditions.append(f"(treatment_name ILIKE ${len(params)} OR category ILIKE ${len(params)})")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""
        SELECT treatment_code, treatment_name, category, price, is_eligible_for_insurance, is_active
        FROM treatment_catalogue
        {where_clause}
        ORDER BY category ASC, treatment_name ASC
    """
    rows = await conn.fetch(query, *params)
    return [
        TreatmentResponse(
            treatment_code=r["treatment_code"],
            treatment_name=r["treatment_name"],
            category=r["category"],
            price=float(r["price"]),
            is_eligible_for_insurance=bool(r["is_eligible_for_insurance"]),
            is_active=bool(r["is_active"]),
        )
        for r in rows
    ]


@router.get(
    "/categories",
    response_model=List[str],
    summary="List treatment categories",
)
async def list_treatment_categories(
    conn: Connection = Depends(get_conn),
):
    rows = await conn.fetch(
        "SELECT DISTINCT category FROM treatment_catalogue WHERE category IS NOT NULL ORDER BY category ASC"
    )
    return [r["category"] for r in rows]


@router.get(
    "/{treatment_code}",
    response_model=TreatmentResponse,
    summary="Get single treatment detail",
)
async def get_treatment(
    treatment_code: int,
    conn: Connection = Depends(get_conn),
):
    row = await conn.fetchrow(
        """
        SELECT treatment_code, treatment_name, category, price, is_eligible_for_insurance, is_active
        FROM treatment_catalogue
        WHERE treatment_code = $1
        """,
        treatment_code,
    )
    if not row:
        raise NotFoundError(f"Treatment with code {treatment_code} not found.")

    return TreatmentResponse(
        treatment_code=row["treatment_code"],
        treatment_name=row["treatment_name"],
        category=row["category"],
        price=float(row["price"]),
        is_eligible_for_insurance=bool(row["is_eligible_for_insurance"]),
        is_active=bool(row["is_active"]),
    )


@router.post(
    "",
    response_model=TreatmentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("Administrator"))],
    summary="Add new treatment to catalogue (Admin only)",
)
async def create_treatment(
    payload: TreatmentCreateRequest,
    conn: Connection = Depends(get_conn),
):
    """
    Add a new treatment entry to the catalogue (FR-TCM-02).
    """
    name = payload.treatment_name.strip()
    existing = await conn.fetchval(
        "SELECT 1 FROM treatment_catalogue WHERE LOWER(treatment_name) = LOWER($1)",
        name,
    )
    if existing:
        raise ConflictError(f"Treatment with name '{name}' already exists.")

    row = await conn.fetchrow(
        """
        INSERT INTO treatment_catalogue (
            treatment_name, category, price, is_eligible_for_insurance, is_active
        )
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING treatment_code, treatment_name, category, price, is_eligible_for_insurance, is_active
        """,
        name,
        payload.category.strip(),
        payload.price,
        payload.is_eligible_for_insurance,
    )

    return TreatmentResponse(
        treatment_code=row["treatment_code"],
        treatment_name=row["treatment_name"],
        category=row["category"],
        price=float(row["price"]),
        is_eligible_for_insurance=bool(row["is_eligible_for_insurance"]),
        is_active=bool(row["is_active"]),
    )


@router.put(
    "/{treatment_code}",
    response_model=TreatmentResponse,
    dependencies=[Depends(require_roles("Administrator"))],
    summary="Update treatment in catalogue (Admin only)",
)
async def update_treatment(
    treatment_code: int,
    payload: TreatmentUpdateRequest,
    conn: Connection = Depends(get_conn),
):
    """
    Update treatment catalogue entry details (FR-TCM-03).
    """
    existing = await conn.fetchrow(
        "SELECT treatment_code FROM treatment_catalogue WHERE treatment_code = $1",
        treatment_code,
    )
    if not existing:
        raise NotFoundError(f"Treatment with code {treatment_code} not found.")

    updates = []
    params = [treatment_code]

    if payload.treatment_name is not None:
        params.append(payload.treatment_name.strip())
        updates.append(f"treatment_name = ${len(params)}")

    if payload.category is not None:
        params.append(payload.category.strip())
        updates.append(f"category = ${len(params)}")

    if payload.price is not None:
        params.append(payload.price)
        updates.append(f"price = ${len(params)}")

    if payload.is_eligible_for_insurance is not None:
        params.append(payload.is_eligible_for_insurance)
        updates.append(f"is_eligible_for_insurance = ${len(params)}")

    if payload.is_active is not None:
        params.append(payload.is_active)
        updates.append(f"is_active = ${len(params)}")

    if updates:
        sql = f"""
            UPDATE treatment_catalogue
            SET {', '.join(updates)}
            WHERE treatment_code = $1
            RETURNING treatment_code, treatment_name, category, price, is_eligible_for_insurance, is_active
        """
        row = await conn.fetchrow(sql, *params)
    else:
        row = await conn.fetchrow(
            """
            SELECT treatment_code, treatment_name, category, price, is_eligible_for_insurance, is_active
            FROM treatment_catalogue
            WHERE treatment_code = $1
            """,
            treatment_code,
        )

    return TreatmentResponse(
        treatment_code=row["treatment_code"],
        treatment_name=row["treatment_name"],
        category=row["category"],
        price=float(row["price"]),
        is_eligible_for_insurance=bool(row["is_eligible_for_insurance"]),
        is_active=bool(row["is_active"]),
    )


@router.put(
    "/{treatment_code}/deactivate",
    response_model=TreatmentResponse,
    dependencies=[Depends(require_roles("Administrator"))],
    summary="Deactivate treatment using fn_deactivate_treatment (Admin only)",
)
async def deactivate_treatment(
    treatment_code: int,
    conn: Connection = Depends(get_conn),
):
    """
    Soft-deactivates treatment in catalogue by calling fn_deactivate_treatment() (FR-TCM-05).
    Preserves historical billing references.
    """
    existing = await conn.fetchrow(
        "SELECT treatment_code FROM treatment_catalogue WHERE treatment_code = $1",
        treatment_code,
    )
    if not existing:
        raise NotFoundError(f"Treatment with code {treatment_code} not found.")

    await conn.execute("SELECT fn_deactivate_treatment($1)", treatment_code)

    row = await conn.fetchrow(
        """
        SELECT treatment_code, treatment_name, category, price, is_eligible_for_insurance, is_active
        FROM treatment_catalogue
        WHERE treatment_code = $1
        """,
        treatment_code,
    )

    return TreatmentResponse(
        treatment_code=row["treatment_code"],
        treatment_name=row["treatment_name"],
        category=row["category"],
        price=float(row["price"]),
        is_eligible_for_insurance=bool(row["is_eligible_for_insurance"]),
        is_active=bool(row["is_active"]),
    )
