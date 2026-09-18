from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError

# TODO: change this import to match wherever your DB dependency actually
# lives (e.g. `from app.db import get_db`). get_db is assumed to yield a
# connection with an asyncpg-style `.fetchrow(query, *args)` interface --
# adjust the query calls below if your project uses psycopg instead.
from app.db import get_db

from auth_utils import verify_password, create_access_token, decode_access_token
from schemas import LoginRequest, TokenResponse, MeResponse

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

LOCKOUT_THRESHOLD = 5  # placeholder per database.md §14 -- confirm before shipping


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db=Depends(get_db)):
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

    if attempt["is_locked"]:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Account locked until {attempt['locked_until']}",
        )

    if not password_ok:
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

    return TokenResponse(access_token=token, token_type="bearer")


@router.post("/logout")
async def logout():
    # Stateless JWT: nothing to invalidate server-side. Frontend just discards
    # the token. Add a token-blocklist table here later if you ever need
    # server-side revocation before expiry.
    return {"message": "Logged out"}


@router.get("/me", response_model=MeResponse)
async def get_me(token: str = Depends(oauth2_scheme)):
    try:
        payload = decode_access_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return MeResponse(
        user_id=payload["user_id"],
        username=payload["username"],
        role=payload["role"],
        branch_id=payload.get("branch_id"),
    )