from dataclasses import dataclass
from typing import Optional
from fastapi import Depends, Request
from app.errors import UnauthorizedError, ForbiddenError
from app.security import decode_access_token
from app.db import get_conn, get_admin_conn  # adjust path if db.py lives elsewhere

@dataclass
class CurrentUser:
    user_id: int
    role: str
    branch_id: Optional[int]
    username: str

async def get_current_user(request: Request) -> CurrentUser:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()

    if not token:
        raise UnauthorizedError("Missing authentication token.")

    payload = decode_access_token(token)

    if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
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
    if current_user.role == "Administrator":
        return None
    return current_user.branch_id


async def get_db(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Administrator connection selection (database.md §3.1). Routes that use
    Depends(get_db) instead of Depends(get_conn) directly automatically get
    the catms_admin pool when the caller is an Administrator, and the
    catms_app pool otherwise. get_current_user has already run and set
    request.state.user by the time this executes, so get_conn/get_admin_conn's
    existing RLS session-context logic (which reads request.state.user)
    still works unchanged.
    """
    if current_user.role == "Administrator":
        async for conn in get_admin_conn(request):
            yield conn
    else:
        async for conn in get_conn(request):
            yield conn