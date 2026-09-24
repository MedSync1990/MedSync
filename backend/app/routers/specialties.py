from typing import List
from fastapi import APIRouter, Depends, status
from asyncpg import Connection

from app.dependencies import get_db, require_roles, CurrentUser
from app.schemas.specialties import SpecialtyCreate, SpecialtyResponse
from app.errors import ConflictError

router = APIRouter()

@router.get("", response_model=List[SpecialtyResponse])
async def list_specialties(
    conn: Connection = Depends(get_db),
    user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Doctor", "Receptionist")),
):
    """
    Returns all  specialties with doctor_count.
    Open to all logged in users
    """

    query = """
            SELECT
                s.specialty_id,
                s.name,
                s.description,
                COUNT(ds.user_id)::int AS doctor_count
            FROM specialty s
            LEFT JOIN doctor_specialty ds
            ON s.specialty_id = ds.specialty_id
            GROUP BY s.specialty_id, s.name, s.description
            ORDER BY s.name ASC;
            """
    rows = await conn.fetch(query)
    return [
                SpecialtyResponse(
                    specialty_id = r["specialty_id"],
                    name = r["name"],
                    description=r["description"],
                    doctor_count=r["doctor_count"]
                )
                for r in rows
            ]

@router.post("",response_model=SpecialtyResponse, 
status_code=status.HTTP_201_CREATED)
async def create_specialty(
    payload: SpecialtyCreate,
    conn: Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_roles("Administrator")),
):
    """
    Creates a new specialty
    """

    check_query = "SELECT specialty_id FROM specialty WHERE LOWER(name) = LOWER($1);"
    existing = await conn.fetchrow(check_query, payload.name.strip())
    if existing:
        raise ConflictError(f"Specialty '{payload.name}' already exists.")

    # Insert new specialty
    insert_query = """
        INSERT INTO specialty (name, description)
        VALUES ($1, $2)
        RETURNING specialty_id, name, description;
    """

    record = await conn.fetchrow(insert_query, payload.name.strip(), payload.description)

    return SpecialtyResponse(
        specialty_id=record["specialty_id"],
        name=record["name"],
        description=record["description"],
        doctor_count=0
    ) 
        

        
        


