from typing import List
from fastapi import APIRouter, Depends, status
from asyncpg import Connection

from app.dependencies import get_db, require_roles, CurrentUser
from app.schemas.specialties import SpecialtyCreate, SpecialtyUpdate, SpecialtyResponse
from app.errors import ConflictError, NotFoundError

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
# default HTTP response status to 201 Created upon successful execution. 
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


@router.put("/{specialty_id}", response_model=SpecialtyResponse)
async def update_specialty(
    specialty_id: int,
    payload: SpecialtyUpdate,
    conn: Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_roles("Administrator")),
):
    """
    Updates an existing specialty name or description. Admin only.
    """
    existing = await conn.fetchrow(
        "SELECT specialty_id, name, description FROM specialty WHERE specialty_id = $1;",
        specialty_id
    )
    if not existing:
        raise NotFoundError(f"Specialty with ID {specialty_id} not found.")

    new_name = payload.name.strip() if payload.name is not None else existing["name"]
    new_desc = payload.description if payload.description is not None else existing["description"]

    if new_name.lower() != existing["name"].lower():
        name_check = await conn.fetchrow(
            "SELECT specialty_id FROM specialty WHERE LOWER(name) = LOWER($1) AND specialty_id != $2;",
            new_name,
            specialty_id
        )
        if name_check:
            raise ConflictError(f"Specialty '{new_name}' already exists.")

    updated_rec = await conn.fetchrow(
        """
        UPDATE specialty
        SET name = $1, description = $2
        WHERE specialty_id = $3
        RETURNING specialty_id, name, description;
        """,
        new_name,
        new_desc,
        specialty_id
    )

    count_row = await conn.fetchrow(
        "SELECT COUNT(*)::int as count FROM doctor_specialty WHERE specialty_id = $1;",
        specialty_id
    )
    doctor_count = count_row["count"] if count_row else 0

    return SpecialtyResponse(
        specialty_id=updated_rec["specialty_id"],
        name=updated_rec["name"],
        description=updated_rec["description"],
        doctor_count=doctor_count
    )


@router.delete("/{specialty_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_specialty(
    specialty_id: int,
    conn: Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_roles("Administrator")),
):
    """
    Deletes a specialty if no doctors are assigned to it. Admin only.
    """
    existing = await conn.fetchrow(
        "SELECT specialty_id, name FROM specialty WHERE specialty_id = $1;",
        specialty_id
    )
    if not existing:
        raise NotFoundError(f"Specialty with ID {specialty_id} not found.")

    doc_count = await conn.fetchval(
        "SELECT COUNT(*) FROM doctor_specialty WHERE specialty_id = $1;",
        specialty_id
    )
    if doc_count > 0:
        raise ConflictError(
            f"Cannot delete specialty '{existing['name']}' because it is currently assigned to {doc_count} doctor(s). Reassign them first."
        )

    await conn.execute("DELETE FROM specialty WHERE specialty_id = $1;", specialty_id)
    return None
        

        
        


