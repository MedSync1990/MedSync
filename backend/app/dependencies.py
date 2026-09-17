from dataclasses import dataclass
from typing import Optional
from fastapi import Depends, Request
from app.errors import UnauthorizedError, ForbiddenError

@dataclass
class CurrentUser:
    user_id: int
    role: str
    branch_id: Optional[int]
    first_name: str
    last_name: str

async def get_current_user(request: Request) -> CurrentUser:
    # Stub: Ashen will implement actual JWT decoding here
    # For now, it expects the Authorization header to be "Bearer <role>" just for testing
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise UnauthorizedError("Missing or invalid token.")
    
    token = auth.split(" ")[1]
    
    # Stub logic for testing routes without a real JWT
    role = token if token in ["Administrator", "Branch Manager", "Doctor", "Receptionist", "Patient"] else "Administrator"
    
    user = CurrentUser(
        user_id=1,
        role=role,
        branch_id=1 if role != "Administrator" else None,
        first_name="Test",
        last_name="User"
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
