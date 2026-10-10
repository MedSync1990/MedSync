from dataclasses import dataclass
from typing import Optional
from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.errors import UnauthorizedError, ForbiddenError
from app.security import decode_access_token
from app.db import get_conn, get_admin_conn  # adjust path if db.py lives elsewhere

security = HTTPBearer(auto_error=False)

@dataclass
class CurrentUser:
    user_id: int
    role: str
    branch_id: Optional[int]
    username: str

async def get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> CurrentUser:
    token = request.cookies.get("access_token")
    if not token and creds:
        token = creds.credentials
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()

    if not token:
        raise UnauthorizedError("Missing authentication token.")

    payload = decode_access_token(token)

    if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
        from app.config import config
        origin = request.headers.get("origin")
        referer = request.headers.get("referer", "")
        is_docs = "/docs" in referer or "/redoc" in referer
        
        # If the request comes from our trusted frontend domain or Swagger docs, we rely on CORS 
        # and the browser's Origin header for CSRF protection.
        if not is_docs and (not origin or origin not in config.CORS_ALLOWED_ORIGINS):
            cookie_csrf = request.cookies.get("csrf_token")
            header_csrf = request.headers.get("X-CSRF-Token")

            if not cookie_csrf or not header_csrf or cookie_csrf != header_csrf:
                raise ForbiddenError("CSRF token missing or invalid.")

    user = CurrentUser(
        user_id=payload["user_id"],
        role=payload["role"],
        branch_id=payload.get("branch_id"),
        username=payload["username"]
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