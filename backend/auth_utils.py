from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt
import os

# Password hashing context configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = os.getenv("ALGORITHM")
if not ALGORITHM:
    raise RuntimeError("ALGORITHM is not set")

ACCESS_TOKEN_EXPIRE_MINUTES = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")
if not ACCESS_TOKEN_EXPIRE_MINUTES:
    raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES is not set")
ACCESS_TOKEN_EXPIRE_MINUTES = int(ACCESS_TOKEN_EXPIRE_MINUTES)

SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET is not set")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)