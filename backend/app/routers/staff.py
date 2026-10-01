import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any

from app.db import get_conn
from app.dependencies import require_roles, get_current_user, CurrentUser
from app.schemas.staff import StaffCreate, StaffUpdate, StaffResponse
from app.security import hash_password
import secrets
import string

router = APIRouter(dependencies=[Depends(require_roles("Administrator", "Branch Manager"))])

def generate_temp_password(length=12):
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for i in range(length))

@router.get("/", response_model=Dict[str, Any])
async def list_staff(
    branch_id: int = None,
    role_id: int = None,
    is_active: bool = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_conn)
):
    query = """
        SELECT s.user_id, s.username, s.is_active, s.branch_id,
               a.first_name, a.last_name, a.id_number, a.email,
               r.role_name,
               (SELECT phone_number FROM contact c WHERE c.user_id = s.user_id LIMIT 1) as phone_number
        FROM staff s
        JOIN app_user a ON s.user_id = a.user_id
        JOIN role r ON a.role_id = r.role_id
        WHERE 1=1
    """
    args = []
    
    if current_user.role == "Branch Manager":
        args.append(current_user.branch_id)
        query += f" AND s.branch_id = ${len(args)}"
    elif branch_id:
        args.append(branch_id)
        query += f" AND s.branch_id = ${len(args)}"
        
    if role_id:
        args.append(role_id)
        query += f" AND a.role_id = ${len(args)}"
        
    if is_active is not None:
        args.append(is_active)
        query += f" AND s.is_active = ${len(args)}"
        
    query += " ORDER BY s.user_id"
    rows = await db.fetch(query, *args)
    
    staff_members = [dict(r) for r in rows]
    return {"data": staff_members, "total": len(staff_members)}

@router.post("/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_staff(
    payload: StaffCreate, 
    current_user: CurrentUser = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_conn)
):
    if current_user.role == "Branch Manager" and current_user.branch_id != payload.branch_id:
        raise HTTPException(status_code=403, detail="You can only add staff to your own branch.")

    role = await db.fetchrow("SELECT role_name FROM role WHERE role_id = $1", payload.role_id)
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role_id")
    role_name = role['role_name']
    
    if role_name == "Doctor":
        if not payload.specialty or not payload.license_number:
            raise HTTPException(status_code=400, detail="Doctors must have a specialty and a license_number")

    async with db.transaction():
        existing = await db.fetchrow("SELECT user_id FROM app_user WHERE id_number = $1", payload.id_number)
        if existing:
            raise HTTPException(status_code=400, detail="A user with this NIC already exists.")

        user_row = await db.fetchrow(
            """
            INSERT INTO app_user (role_id, first_name, middle_name, last_name, id_number, address, birthdate, gender, email)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING user_id
            """,
            payload.role_id, payload.first_name, payload.middle_name, payload.last_name, 
            payload.id_number, payload.address, payload.birthdate, payload.gender, payload.email
        )
        new_user_id = user_row['user_id']

        await db.execute(
            "INSERT INTO contact (user_id, phone_number) VALUES ($1, $2)",
            new_user_id, payload.phone_number
        )

        username = f"{payload.first_name.lower()}.{payload.last_name.lower()}{new_user_id}"
        temp_password = generate_temp_password()
        hashed_pw = hash_password(temp_password)

        await db.execute(
            """
            INSERT INTO staff (user_id, branch_id, username, password_hash)
            VALUES ($1, $2, $3, $4)
            """,
            new_user_id, payload.branch_id, username, hashed_pw
        )

        if role_name == "Doctor":
            spec_row = await db.fetchrow("SELECT specialty_id FROM specialty WHERE name = $1", payload.specialty)
            if not spec_row:
                spec_row = await db.fetchrow("INSERT INTO specialty (name) VALUES ($1) RETURNING specialty_id", payload.specialty)
            specialty_id = spec_row['specialty_id']
            
            await db.execute("INSERT INTO doctor (user_id, license_number) VALUES ($1, $2)", new_user_id, payload.license_number)
            await db.execute("INSERT INTO doctor_specialty (user_id, specialty_id) VALUES ($1, $2)", new_user_id, specialty_id)
            
    return {
        "message": "Staff registered successfully",
        "user_id": new_user_id,
        "username": username,
        "temporary_password": temp_password
    }

@router.put("/{id}/deactivate")
async def deactivate_staff(
    id: int, 
    current_user: CurrentUser = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_conn)
):
    if current_user.role == "Branch Manager":
        staff_branch = await db.fetchval("SELECT branch_id FROM staff WHERE user_id = $1", id)
        if staff_branch != current_user.branch_id:
            raise HTTPException(status_code=403, detail="You can only deactivate staff in your own branch.")

    await db.execute("SELECT fn_deactivate_staff($1)", id)
    return {"message": "Staff deactivated successfully", "user_id": id}
