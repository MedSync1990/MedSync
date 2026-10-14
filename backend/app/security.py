from datetime import datetime, timedelta, timezone
import jwt
import bcrypt
from fastapi import Request
from app.config import config
from app.errors import UnauthorizedError, ForbiddenError


def require_trusted_origin(request: Request) -> None:
    """Protect browser mutations using the exact configured frontend/API origins.

    Missing/null origins and Referer paths never grant access. Non-browser
    clients should use bearer-only authentication on protected API routes.
    """
    origin = request.headers.get("origin")
    if not origin or origin == "null" or origin not in config.CORS_ALLOWED_ORIGINS:
        raise ForbiddenError("Untrusted or missing request origin.")

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=config.JWT_EXPIRY_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, config.JWT_SECRET, algorithm="HS256")
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError("Your session has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise UnauthorizedError("Invalid token.")

def generate_csrf_token() -> str:
    import secrets
    return secrets.token_urlsafe(32)
