import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any

from app.db import get_conn
from app.dependencies import require_roles, get_current_user, CurrentUser
from app.schemas.staff import StaffCreate, StaffUpdate, StaffResponse, StaffResetPassword
from app.security import hash_password
import secrets
import string

router = APIRouter(dependencies=[Depends(require_roles("Administrator", "Branch Manager"))])

def generate_temp_password(length=12):
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for i in range(length))

@router.get("/", response_model=Dict[str, Any])
async def list_staff(
    branch_id: int | None = None,
    role_id: int | None = None,
    is_active: bool | None = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_conn)
):
    query = """
        SELECT s.user_id, s.username, s.is_active, s.branch_id,
               a.first_name, a.last_name, a.id_number, a.email,
               a.address, a.birthdate, a.gender, a.created_at,
               r.role_name,
               (SELECT phone_number FROM contact c WHERE c.user_id = s.user_id LIMIT 1) as phone_number,
               d.license_number,
               sp.name as specialty,
               b.name as branch_name,
               s.last_login_at, s.failed_login_attempts, s.locked_until,
               COALESCE(s.must_change_password, FALSE) as must_change_password
        FROM staff s
        JOIN app_user a ON s.user_id = a.user_id
        JOIN role r ON a.role_id = r.role_id
        JOIN branch b ON s.branch_id = b.branch_id
        LEFT JOIN doctor d ON s.user_id = d.user_id
        LEFT JOIN doctor_specialty ds ON s.user_id = ds.user_id
        LEFT JOIN specialty sp ON ds.specialty_id = sp.specialty_id
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
    
    # Role restriction checks
    if role_name == "Patient":
        raise HTTPException(status_code=400, detail="Patients cannot be registered via the staff management endpoint.")

    if current_user.role == "Branch Manager" and role_name not in ["Doctor", "Receptionist"]:
        raise HTTPException(status_code=403, detail="Branch Managers are only permitted to create Doctors and Receptionists.")
    
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
        
        if not user_row:
            raise HTTPException(status_code=500, detail="Failed to create user record.")
            
        new_user_id = user_row['user_id']

        await db.execute(
            "INSERT INTO contact (user_id, phone_number) VALUES ($1, $2)",
            new_user_id, payload.phone_number
        )

        # Format the role name to be a clean prefix (e.g. "Receptionist" -> "receptionist")
        role_prefix = role_name.lower().replace(" ", "")
        
        # Count how many users have this role to append the number
        role_count = await db.fetchval("SELECT COUNT(*) FROM app_user WHERE role_id = $1", payload.role_id)
        
        # Create the username (e.g. receptionist1, receptionist2)
        username = f"{role_prefix}{role_count}"
        
        # Set the default temporary password to "medsync"
        temp_password = "medsync"
        
        # Hash the password before saving
        hashed_pw = hash_password(temp_password)

        await db.execute(
            """
            INSERT INTO staff (user_id, branch_id, username, password_hash, must_change_password)
            VALUES ($1, $2, $3, $4, TRUE)
            """,
            new_user_id, payload.branch_id, username, hashed_pw
        )

        if role_name == "Doctor":
            spec_row = await db.fetchrow("SELECT specialty_id FROM specialty WHERE LOWER(name) = LOWER($1)", payload.specialty)
            if not spec_row:
                try:
                    spec_row = await db.fetchrow("INSERT INTO specialty (name) VALUES ($1) RETURNING specialty_id", payload.specialty)
                except asyncpg.exceptions.UniqueViolationError:
                    spec_row = await db.fetchrow("SELECT specialty_id FROM specialty WHERE LOWER(name) = LOWER($1)", payload.specialty)
            
            if not spec_row:
                raise HTTPException(status_code=500, detail="Failed to create specialty record.")
            specialty_id = spec_row['specialty_id']
            
            await db.execute("INSERT INTO doctor (user_id, license_number) VALUES ($1, $2)", new_user_id, payload.license_number)
            await db.execute("INSERT INTO doctor_specialty (user_id, specialty_id) VALUES ($1, $2)", new_user_id, specialty_id)
            
        if payload.bank_accounts:
            for acc in payload.bank_accounts:
                if acc.bank_name and acc.account_number:
                    await db.execute(
                        """
                        INSERT INTO staff_bank_accounts (user_id, bank_name, account_number, branch_name)
                        VALUES ($1, $2, $3, $4)
                        """,
                        new_user_id, acc.bank_name, acc.account_number, acc.bank_branch
                    )
            
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
    # 1. Prevent self-deactivation
    if id == current_user.user_id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")

    target_staff = await db.fetchrow(
        """
        SELECT s.branch_id, r.role_name 
        FROM staff s 
        JOIN app_user a ON s.user_id = a.user_id 
        JOIN role r ON a.role_id = r.role_id 
        WHERE s.user_id = $1
        """, 
        id
    )
    if not target_staff:
        raise HTTPException(status_code=404, detail="Staff member not found.")

    if current_user.role == "Branch Manager":
        if target_staff["branch_id"] != current_user.branch_id:
            raise HTTPException(status_code=403, detail="You can only deactivate staff in your own branch.")
        if target_staff["role_name"] in ["Administrator", "Branch Manager"]:
            raise HTTPException(status_code=403, detail="Branch Managers cannot deactivate Administrators or Branch Managers.")

    # 2. Last remaining active administrator guard
    if target_staff["role_name"] == "Administrator":
        active_admin_count = await db.fetchval(
            """
            SELECT COUNT(*) FROM staff s 
            JOIN app_user a ON s.user_id = a.user_id 
            JOIN role r ON a.role_id = r.role_id 
            WHERE r.role_name = 'Administrator' AND s.is_active = TRUE
            """
        )
        if active_admin_count is not None and active_admin_count <= 1:
            raise HTTPException(
                status_code=400, 
                detail="Cannot deactivate the last remaining active Administrator in the system."
            )

    # 3. Doctor upcoming appointments guard
    if target_staff["role_name"] == "Doctor":
        pending_appts = await db.fetchval(
            """
            SELECT COUNT(*) 
            FROM appointments a
            JOIN doctor_availability_slots s ON a.slot_id = s.slot_id
            WHERE s.doctor_id = $1 AND s.date >= CURRENT_DATE AND a.status = 'Scheduled'
            """,
            id
        )
        if pending_appts and pending_appts > 0:
            raise HTTPException(
                status_code=409, 
                detail=f"Cannot deactivate doctor with {pending_appts} upcoming scheduled appointment(s). Please reassign or cancel them first."
            )

    await db.execute("SELECT fn_deactivate_staff($1)", id)
    return {"message": "Staff deactivated successfully", "user_id": id}

@router.put("/{id}/unlock")
async def unlock_staff(
    id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_conn)
):
    if current_user.role == "Branch Manager":
        staff_branch = await db.fetchval("SELECT branch_id FROM staff WHERE user_id = $1", id)
        if staff_branch != current_user.branch_id:
            raise HTTPException(status_code=403, detail="You can only unlock staff in your own branch.")

    await db.execute(
        "UPDATE staff SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = $1", 
        id
    )
    return {"message": "Staff account unlocked successfully", "user_id": id}

@router.put("/{id}/reset-password")
async def reset_staff_password(
    id: int,
    payload: StaffResetPassword,
    current_user: CurrentUser = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_conn)
):
    if current_user.role == "Branch Manager":
        staff_branch = await db.fetchval("SELECT branch_id FROM staff WHERE user_id = $1", id)
        if staff_branch != current_user.branch_id:
            raise HTTPException(status_code=403, detail="You can only reset passwords for staff in your own branch.")
    
    hashed_pw = hash_password(payload.password)
    await db.execute(
        "UPDATE staff SET password_hash = $1, must_change_password = TRUE WHERE user_id = $2", 
        hashed_pw, id
    )
    
    return {"message": "Password reset successfully", "temporary_password": payload.password}

@router.put("/{id}")
async def update_staff(
    id: int,
    payload: StaffUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_conn)
):
    if current_user.role == "Branch Manager":
        staff_branch = await db.fetchval("SELECT branch_id FROM staff WHERE user_id = $1", id)
        if staff_branch != current_user.branch_id:
            raise HTTPException(status_code=403, detail="You can only edit staff in your own branch.")
            
    async with db.transaction():
        # Update app_user
        set_clauses: list[str] = []
        args: list[Any] = []
        if payload.first_name is not None:
            args.append(payload.first_name)
            set_clauses.append(f"first_name = ${len(args)}")
        if payload.last_name is not None:
            args.append(payload.last_name)
            set_clauses.append(f"last_name = ${len(args)}")
        if payload.address is not None:
            args.append(payload.address)
            set_clauses.append(f"address = ${len(args)}")
        if payload.email is not None:
            args.append(payload.email)
            set_clauses.append(f"email = ${len(args)}")
            
        if set_clauses:
            args.append(id)
            query = f"UPDATE app_user SET {', '.join(set_clauses)} WHERE user_id = ${len(args)}"
            await db.execute(query, *args)
            
        # Update phone number
        if payload.phone_number is not None:
            await db.execute("UPDATE contact SET phone_number = $1 WHERE user_id = $2", payload.phone_number, id)
            
        # Update branch or active status
        staff_set: list[str] = []
        staff_args: list[Any] = []
        if payload.branch_id is not None:
            staff_args.append(payload.branch_id)
            staff_set.append(f"branch_id = ${len(staff_args)}")
        if payload.is_active is not None:
            staff_args.append(payload.is_active)
            staff_set.append(f"is_active = ${len(staff_args)}")
            
        if staff_set:
            staff_args.append(id)
            query = f"UPDATE staff SET {', '.join(staff_set)} WHERE user_id = ${len(staff_args)}"
            await db.execute(query, *staff_args)
            
    return {"message": "Staff updated successfully"}
