from dataclasses import dataclass
from typing import Optional
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.errors import UnauthorizedError, ForbiddenError
from app.security import decode_access_token, require_trusted_origin, require_csrf_token
from app.db import get_conn, get_admin_conn  # adjust path if db.py lives elsewhere

security = HTTPBearer(auto_error=False)

@dataclass
class CurrentUser:
    user_id: int
    role: str
    branch_id: Optional[int]
    username: str
    csrf_token: Optional[str] = None

async def get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> CurrentUser:
    token = request.cookies.get("access_token")
    cookie_authenticated = bool(token)
    if not token and creds:
        token = creds.credentials
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()

    if not token:
        raise UnauthorizedError("Missing authentication token.")

    payload = decode_access_token(token)

    if cookie_authenticated and request.method in ["POST", "PUT", "PATCH", "DELETE"]:
        require_trusted_origin(request)
        require_csrf_token(request, payload.get("csrf_token"))

    # Only accept accounts whose active status can be confirmed.
    user_id = payload.get("user_id")
    pool = getattr(request.app.state, "pool", None)
    if not user_id:
        raise UnauthorizedError("Invalid authentication token.")

    if pool is None:
        raise HTTPException(
            status_code=503,
            detail="Authentication service temporarily unavailable.",
        )

    try:
        async with pool.acquire() as conn:
            is_active = await conn.fetchval(
                "SELECT is_active FROM staff WHERE user_id = $1", user_id
            )
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Authentication service temporarily unavailable.",
        )

    if is_active is not True:
        raise UnauthorizedError("Account unavailable or deactivated.")

    user = CurrentUser(
        user_id=payload["user_id"],
        role=payload["role"],
        branch_id=payload.get("branch_id"),
        username=payload["username"],
        csrf_token=payload.get("csrf_token"),
    )
    request.state.user = user
    return user

def require_roles(*allowed_roles: str):
    async def role_checker(current_user: CurrentUser = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise ForbiddenError()
        return current_user
    return role_checker

def get_branch_scope(current_user: CurrentUser) -> Optional[int]:
    """Return the branch a caller is allowed to access."""
    if current_user.role == "Administrator":
        return None
    return current_user.branch_id


def get_effective_branch_id(current_user: CurrentUser, requested_branch_id: Optional[int] = None) -> Optional[int]:
    """
    Enforce the server-side branch override required by api-routes.md §0.5.
    Branch Managers are always pinned to their own branch_id, even if the client sends a
    different branch filter value. Administrators still receive the requested branch when one
    is supplied; other roles keep their direct request value or branch context.
    """
    if current_user.role == "Branch Manager":
        return get_branch_scope(current_user)
    if current_user.role == "Administrator":
        return requested_branch_id
    return requested_branch_id if requested_branch_id is not None else current_user.branch_id


async def get_db(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Administrator connection selection (database.md §3.1). Routes that depend on
    get_db automatically pick the catms_admin pool when the caller is an Administrator,
    and the catms_app pool otherwise. The role-aware pool selection happens in get_conn,
    while the transaction-local RLS values are still set from the authenticated user.
    """
    async for conn in get_conn(request):
        yield conn
