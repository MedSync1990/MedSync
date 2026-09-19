from dataclasses import dataclass
from typing import Optional
from fastapi import Depends, Request
from app.errors import UnauthorizedError, ForbiddenError
from app.security import decode_access_token

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
