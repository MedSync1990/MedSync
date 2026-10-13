from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
import asyncpg

from app.dependencies import require_roles, CurrentUser, get_db
from app.errors import NotFoundError, ConflictError
from app.schemas.branches import BranchCreate, BranchUpdate, BranchResponse

router = APIRouter()


BRANCH_BASE_QUERY = """
    SELECT 
        b.branch_id,
        b.name,
        b.address,
        b.phone_number,
        b.is_active,
        COALESCE(sc.staff_count, 0)::int AS staff_count,
        bm.user_id AS branch_manager_id,
        bm.full_name AS branch_manager_name
    FROM branch b
    LEFT JOIN (
        SELECT branch_id, COUNT(*) AS staff_count
        FROM staff
        WHERE is_active = TRUE
        GROUP BY branch_id
    ) sc ON sc.branch_id = b.branch_id
    LEFT JOIN LATERAL (
        SELECT 
            s.user_id,
            (u.first_name || ' ' || u.last_name) AS full_name
        FROM staff s
        JOIN app_user u ON u.user_id = s.user_id
        JOIN role r ON r.role_id = u.role_id
        WHERE s.branch_id = b.branch_id 
          AND r.role_name = 'Branch Manager' 
          AND s.is_active = TRUE
        ORDER BY s.user_id DESC
        LIMIT 1
    ) bm ON TRUE
    WHERE ($1::int IS NULL OR b.branch_id = $1)
      AND ($2::boolean IS NULL OR b.is_active = $2)
    ORDER BY b.name ASC;
"""


async def _fetch_branch(conn: asyncpg.Connection, branch_id: int) -> dict:
    row = await conn.fetchrow(BRANCH_BASE_QUERY, branch_id, None)
    if not row:
        raise NotFoundError(f"Branch #{branch_id} not found.")
    return dict(row)


@router.get("", response_model=List[BranchResponse])
@router.get("/", response_model=List[BranchResponse])
async def list_branches(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    conn: asyncpg.Connection = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Receptionist")),
):
    """
    List branches. Admin sees all branches; Branch Manager sees only their own branch.
    """
    effective_branch_id = current_user.branch_id
    if current_user.role == "Branch Manager" and not effective_branch_id:
        staff_bid = await conn.fetchval(
            "SELECT branch_id FROM staff WHERE user_id = $1 AND is_active = TRUE",
            current_user.user_id,
        )
        if staff_bid:
            effective_branch_id = staff_bid

    target_branch = effective_branch_id if current_user.role == "Branch Manager" else None
    rows = await conn.fetch(BRANCH_BASE_QUERY, target_branch, is_active)

    return [BranchResponse(**dict(r)) for r in rows]


@router.get("/{branch_id}", response_model=BranchResponse)
async def get_branch(
    branch_id: int,
    conn: asyncpg.Connection = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles("Administrator", "Branch Manager")),
):
    """
    Get branch profile by ID. BM restricted to own branch.
    """
    effective_branch_id = current_user.branch_id
    if current_user.role == "Branch Manager" and not effective_branch_id:
        staff_bid = await conn.fetchval(
            "SELECT branch_id FROM staff WHERE user_id = $1 AND is_active = TRUE",
            current_user.user_id,
        )
        if staff_bid:
            effective_branch_id = staff_bid

    if current_user.role == "Branch Manager" and effective_branch_id != branch_id:
        raise NotFoundError(f"Branch #{branch_id} not found.")

    b = await _fetch_branch(conn, branch_id)
    return BranchResponse(**b)


@router.post("", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
async def create_branch(
    payload: BranchCreate,
    conn: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_roles("Administrator")),
):
    """
    Create a new branch. Admin only.
    """
    existing = await conn.fetchrow(
        "SELECT branch_id FROM branch WHERE LOWER(name) = LOWER($1);", payload.name
    )
    if existing:
        raise ConflictError(f"A branch with the name '{payload.name}' already exists.")

    row = await conn.fetchrow(
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
        staff_row = await conn.fetchrow(
            """
            SELECT s.user_id, r.role_name 
            FROM staff s 
            JOIN app_user u ON u.user_id = s.user_id 
            JOIN role r ON r.role_id = u.role_id 
            WHERE s.user_id = $1;
            """,
            payload.branch_manager_id,
        )
        if not staff_row:
            raise NotFoundError(f"Staff member #{payload.branch_manager_id} not found.")
        if staff_row["role_name"] != "Branch Manager":
            raise ConflictError("Only staff with the 'Branch Manager' role can be assigned as a branch manager.")
        await conn.execute(
            "UPDATE staff SET branch_id = $1 WHERE user_id = $2;",
            new_branch_id,
            payload.branch_manager_id,
        )

    b = await _fetch_branch(conn, new_branch_id)
    return BranchResponse(**b)


@router.put("/{branch_id}", response_model=BranchResponse)
async def update_branch(
    branch_id: int,
    payload: BranchUpdate,
    conn: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_roles("Administrator")),
):
    """
    Update branch details. Admin only.
    """
    await _fetch_branch(conn, branch_id)

    if payload.name:
        existing = await conn.fetchrow(
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
        await conn.execute(sql, *params)

    if payload.branch_manager_id is not None:
        staff_row = await conn.fetchrow(
            """
            SELECT s.user_id, r.role_name, s.branch_id
            FROM staff s 
            JOIN app_user u ON u.user_id = s.user_id 
            JOIN role r ON r.role_id = u.role_id 
            WHERE s.user_id = $1;
            """,
            payload.branch_manager_id,
        )
        if not staff_row:
            raise NotFoundError(f"Staff member #{payload.branch_manager_id} not found.")
        if staff_row["role_name"] != "Branch Manager":
            raise ConflictError("Only staff with the 'Branch Manager' role can be assigned as a branch manager.")

        # If this branch already has an active manager different from the selected one,
        # and the selected manager had a previous branch, swap them so both branches keep one manager.
        old_branch_id = staff_row["branch_id"]
        existing_bm = await conn.fetchrow(
            """
            SELECT s.user_id
            FROM staff s
            JOIN app_user u ON u.user_id = s.user_id
            JOIN role r ON r.role_id = u.role_id
            WHERE s.branch_id = $1 AND r.role_name = 'Branch Manager' AND s.user_id != $2 AND s.is_active = TRUE;
            """,
            branch_id,
            payload.branch_manager_id,
        )
        if existing_bm and old_branch_id and old_branch_id != branch_id:
            await conn.execute(
                "UPDATE staff SET branch_id = $1 WHERE user_id = $2;",
                old_branch_id,
                existing_bm["user_id"],
            )

        # Switch the selected manager's branch to this branch
        await conn.execute(
            "UPDATE staff SET branch_id = $1 WHERE user_id = $2;",
            branch_id,
            payload.branch_manager_id,
        )

    b = await _fetch_branch(conn, branch_id)
    return BranchResponse(**b)


@router.put("/{branch_id}/deactivate", response_model=BranchResponse)
async def deactivate_branch(
    branch_id: int,
    conn: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_roles("Administrator")),
):
    """
    Soft-deactivate a branch. Admin only.
    Calls fn_deactivate_branch DB function. Rejects with 409 Conflict if active staff are assigned.
    """
    await _fetch_branch(conn, branch_id)

    try:
        await conn.execute("SELECT fn_deactivate_branch($1);", branch_id)
    except asyncpg.PostgresError as err:
        if "active staff" in str(err).lower() or getattr(err, "sqlstate", None) == "23514":
            raise ConflictError(
                "This branch has staff assigned and can't be deactivated. Reassign staff first."
            )
        raise err

    b = await _fetch_branch(conn, branch_id)
    return BranchResponse(**b)


@router.put("/{branch_id}/reactivate", response_model=BranchResponse)
async def reactivate_branch(
    branch_id: int,
    conn: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_roles("Administrator")),
):
    """
    Reactivate a soft-deactivated branch. Admin only.
    """
    await _fetch_branch(conn, branch_id)
    await conn.execute("UPDATE branch SET is_active = TRUE WHERE branch_id = $1;", branch_id)
    b = await _fetch_branch(conn, branch_id)
    return BranchResponse(**b)
