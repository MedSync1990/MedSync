import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status, Response

from app.db import get_conn
from app.config import config
from app.security import verify_password, create_access_token, decode_access_token, generate_csrf_token
from app.dependencies import require_roles, get_current_user, CurrentUser
from app.schemas.auth import LoginRequest, LoginResponse, MeResponse
from app.errors import UnauthorizedError

router = APIRouter()

LOCKOUT_THRESHOLD = 5 # placeholder per database.md §14 -- confirm before shipping

@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, response: Response, db: asyncpg.Connection = Depends(get_conn)):
    row = await db.fetchrow(
        """
        SELECT s.user_id, s.password_hash, s.branch_id, r.role_name, s.is_active
        FROM staff s
        JOIN app_user u ON u.user_id = s.user_id
        JOIN role r ON r.role_id = u.role_id
        WHERE s.username = $1
        """,
        payload.username,
    )

    password_ok = False
    if row is not None and row["is_active"]:
        password_ok = verify_password(payload.password, row["password_hash"])

    attempt = await db.fetchrow(
        "SELECT * FROM fn_register_login_attempt($1, $2, $3)",
        payload.username,
        password_ok,
        LOCKOUT_THRESHOLD,
    )

    if attempt and attempt["is_locked"]:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Account locked until {attempt['locked_until']}",
        )

    if not password_ok or row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    token = create_access_token(
        {
            "user_id": row["user_id"],
            "role": row["role_name"],
            "branch_id": row["branch_id"],
            "username": payload.username,
        }
    )

    csrf_token = generate_csrf_token()
    max_age = config.JWT_EXPIRY_MINUTES * 60

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=max_age
    )

    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        secure=True,
        samesite="lax",
        max_age=max_age
    )

    return LoginResponse(message="Login successful")


@router.post("/logout")
async def logout(response: Response):
    # Stateless JWT: nothing to invalidate server-side. Frontend just discards
    # the token. Add a token-blocklist table here later if you ever need
    # server-side revocation before expiry.
    response.delete_cookie("access_token")
    response.delete_cookie("csrf_token")
    return {"message": "Logged out"}


@router.get("/me", response_model=MeResponse)
async def get_me(current_user: CurrentUser = Depends(get_current_user)):
    return MeResponse(
        user_id=current_user.user_id,
        username=current_user.username,
        role=current_user.role,
        branch_id=current_user.branch_id,
    )

@router.get("/admin-only-dashboard", dependencies=[Depends(require_roles("Administrator", "Branch Manager"))])
async def admin_dashboard_data():
    return {"message": "Welcome to the admin dashboard! Your role allowed you here."}
