from typing import List
from fastapi import APIRouter, Depends, status
from asyncpg import Connection

from app.db import get_conn
from app.dependencies import require_roles
from app.errors import ConflictError
from app.schemas.allergies import AllergyResponse, AllergyCreateRequest

router = APIRouter()


@router.get(
    "",
    response_model=List[AllergyResponse],
    summary="List all master allergies",
)
async def list_allergies(
    conn: Connection = Depends(get_conn),
):
    """
    Returns master list of known allergies (allergy_id, allergy_code, name)
    to populate select/multi-select dropdowns.
    """
    rows = await conn.fetch(
        "SELECT allergy_id, allergy_code, name FROM allergy ORDER BY name ASC"
    )
    return [
        AllergyResponse(
            allergy_id=r["allergy_id"],
            allergy_code=r["allergy_code"],
            name=r["name"],
        )
        for r in rows
    ]


@router.post(
    "",
    response_model=AllergyResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("Administrator"))],
    summary="Add new master allergy (Admin only)",
)
async def create_allergy(
    payload: AllergyCreateRequest,
    conn: Connection = Depends(get_conn),
):
    """
    Add a new allergy to the master reference catalogue (allergy_code, name).
    """
    code = payload.allergy_code.strip().upper()
    existing = await conn.fetchval(
        "SELECT 1 FROM allergy WHERE UPPER(allergy_code) = $1",
        code,
    )
    if existing:
        raise ConflictError(f"Allergy with code '{code}' already exists.")

    row = await conn.fetchrow(
        """
        INSERT INTO allergy (allergy_code, name)
        VALUES ($1, $2)
        RETURNING allergy_id, allergy_code, name
        """,
        code,
        payload.name.strip(),
    )
    return AllergyResponse(
        allergy_id=row["allergy_id"],
        allergy_code=row["allergy_code"],
        name=row["name"],
    )
