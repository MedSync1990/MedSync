from typing import List
from fastapi import APIRouter, Depends, status
import asyncpg

from app.db import get_conn
from app.dependencies import require_roles, CurrentUser
from app.errors import NotFoundError, ConflictError
from app.schemas.branches import BranchCreate, BranchUpdate, BranchResponse

router = APIRouter()


async def _fetch_branch(db: asyncpg.Connection, branch_id: int) -> dict:
    row = await db.fetchrow(
        """
        SELECT 
            b.branch_id,
            b.name,
            b.address,
            b.phone_number,
            b.is_active,
            (SELECT COUNT(*) FROM staff s WHERE s.branch_id = b.branch_id AND s.is_active = TRUE) as staff_count,
            (
                SELECT s.user_id 
                FROM staff s 
                JOIN app_user u ON u.user_id = s.user_id 
                JOIN role r ON r.role_id = u.role_id 
                WHERE s.branch_id = b.branch_id AND r.role_name = 'Branch Manager' AND s.is_active = TRUE 
                LIMIT 1
            ) as branch_manager_id,
            (
                SELECT (u.first_name || ' ' || u.last_name) 
                FROM staff s 
                JOIN app_user u ON u.user_id = s.user_id 
                JOIN role r ON r.role_id = u.role_id 
                WHERE s.branch_id = b.branch_id AND r.role_name = 'Branch Manager' AND s.is_active = TRUE 
                LIMIT 1
            ) as branch_manager_name
        FROM branch b
        WHERE b.branch_id = $1;
        """,
        branch_id,
    )
    if not row:
        raise NotFoundError(f"Branch #{branch_id} not found.")
    return dict(row)


@router.get("", response_model=List[BranchResponse])
@router.get("/", response_model=List[BranchResponse])
async def list_branches(
    db: asyncpg.Connection = Depends(get_conn),
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Receptionist")),
):
    """
    List branches. Admin sees all branches; Branch Manager sees only their own branch.
    """
    if current_user.role == "Branch Manager" and current_user.branch_id:
        query = """
            SELECT 
                b.branch_id,
                b.name,
                b.address,
                b.phone_number,
                b.is_active,
                (SELECT COUNT(*) FROM staff s WHERE s.branch_id = b.branch_id AND s.is_active = TRUE) as staff_count,
                (
                    SELECT s.user_id 
                    FROM staff s 
                    JOIN app_user u ON u.user_id = s.user_id 
                    JOIN role r ON r.role_id = u.role_id 
                    WHERE s.branch_id = b.branch_id AND r.role_name = 'Branch Manager' AND s.is_active = TRUE 
                    LIMIT 1
                ) as branch_manager_id,
                (
                    SELECT (u.first_name || ' ' || u.last_name) 
                    FROM staff s 
                    JOIN app_user u ON u.user_id = s.user_id 
                    JOIN role r ON r.role_id = u.role_id 
                    WHERE s.branch_id = b.branch_id AND r.role_name = 'Branch Manager' AND s.is_active = TRUE 
                    LIMIT 1
                ) as branch_manager_name
            FROM branch b
            WHERE b.is_active = TRUE AND b.branch_id = $1
            ORDER BY b.name ASC;
        """
        rows = await db.fetch(query, current_user.branch_id)
    else:
        query = """
            SELECT 
                b.branch_id,
                b.name,
                b.address,
                b.phone_number,
                b.is_active,
                (SELECT COUNT(*) FROM staff s WHERE s.branch_id = b.branch_id AND s.is_active = TRUE) as staff_count,
                (
                    SELECT s.user_id 
                    FROM staff s 
                    JOIN app_user u ON u.user_id = s.user_id 
                    JOIN role r ON r.role_id = u.role_id 
                    WHERE s.branch_id = b.branch_id AND r.role_name = 'Branch Manager' AND s.is_active = TRUE 
                    LIMIT 1
                ) as branch_manager_id,
                (
                    SELECT (u.first_name || ' ' || u.last_name) 
                    FROM staff s 
                    JOIN app_user u ON u.user_id = s.user_id 
                    JOIN role r ON r.role_id = u.role_id 
                    WHERE s.branch_id = b.branch_id AND r.role_name = 'Branch Manager' AND s.is_active = TRUE 
                    LIMIT 1
                ) as branch_manager_name
            FROM branch b
            WHERE b.is_active = TRUE
            ORDER BY b.name ASC;
        """
        rows = await db.fetch(query)

    return [BranchResponse(**dict(r)) for r in rows]


@router.get("/{branch_id}", response_model=BranchResponse)
async def get_branch(
    branch_id: int,
    db: asyncpg.Connection = Depends(get_conn),
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager")),
):
    """
    Get branch profile by ID. BM restricted to own branch.
    """
    if current_user.role == "Branch Manager" and current_user.branch_id != branch_id:
        raise NotFoundError(f"Branch #{branch_id} not found.")

    b = await _fetch_branch(db, branch_id)
    return BranchResponse(**b)


@router.post("", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
async def create_branch(
    payload: BranchCreate,
    db: asyncpg.Connection = Depends(get_conn),
    admin: CurrentUser = Depends(require_roles("Administrator")),
):
    """
    Create a new branch. Admin only.
    """
    existing = await db.fetchrow(
        "SELECT branch_id FROM branch WHERE LOWER(name) = LOWER($1);", payload.name
    )
    if existing:
        raise ConflictError(f"A branch with the name '{payload.name}' already exists.")

    row = await db.fetchrow(
        """
        INSERT INTO branch (name, address, phone_number)
        VALUES ($1, $2, $3)
        RETURNING branch_id;
        """,
        payload.name,
        payload.address,
        payload.phone_number,
    )
    new_branch_id = row["branch_id"]

    if payload.branch_manager_id:
        await db.execute(
            "UPDATE staff SET branch_id = $1 WHERE user_id = $2;",
            new_branch_id,
            payload.branch_manager_id,
        )

    b = await _fetch_branch(db, new_branch_id)
    return BranchResponse(**b)


@router.put("/{branch_id}", response_model=BranchResponse)
async def update_branch(
    branch_id: int,
    payload: BranchUpdate,
    db: asyncpg.Connection = Depends(get_conn),
    admin: CurrentUser = Depends(require_roles("Administrator")),
):
    """
    Update branch details. Admin only.
    """
    await _fetch_branch(db, branch_id)

    if payload.name:
        existing = await db.fetchrow(
            "SELECT branch_id FROM branch WHERE LOWER(name) = LOWER($1) AND branch_id != $2;",
            payload.name,
            branch_id,
        )
        if existing:
            raise ConflictError(f"A branch with the name '{payload.name}' already exists.")

    updates = []
    params = []
    param_idx = 1

    if payload.name is not None:
        updates.append(f"name = ${param_idx}")
        params.append(payload.name)
        param_idx += 1

    if payload.address is not None:
        updates.append(f"address = ${param_idx}")
        params.append(payload.address)
        param_idx += 1

    if payload.phone_number is not None:
        updates.append(f"phone_number = ${param_idx}")
        params.append(payload.phone_number)
        param_idx += 1

    if updates:
        params.append(branch_id)
        sql = f"UPDATE branch SET {', '.join(updates)} WHERE branch_id = ${param_idx};"
        await db.execute(sql, *params)

    if payload.branch_manager_id is not None:
        await db.execute(
            "UPDATE staff SET branch_id = $1 WHERE user_id = $2;",
            branch_id,
            payload.branch_manager_id,
        )

    b = await _fetch_branch(db, branch_id)
    return BranchResponse(**b)


@router.put("/{branch_id}/deactivate", response_model=BranchResponse)
async def deactivate_branch(
    branch_id: int,
    db: asyncpg.Connection = Depends(get_conn),
    admin: CurrentUser = Depends(require_roles("Administrator")),
):
    """
    Soft-deactivate a branch. Admin only.
    Calls fn_deactivate_branch DB function. Rejects with 409 Conflict if active staff are assigned.
    """
    await _fetch_branch(db, branch_id)

    try:
        await db.execute("SELECT fn_deactivate_branch($1);", branch_id)
    except asyncpg.PostgresError as err:
        if "active staff" in str(err).lower() or getattr(err, "sqlstate", None) == "23514":
            raise ConflictError(
                "This branch has staff assigned and can't be deactivated. Reassign staff first."
            )
        raise err

    b = await _fetch_branch(db, branch_id)
    return BranchResponse(**b)
