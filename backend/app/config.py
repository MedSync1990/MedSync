# app/config.py
import json
from pathlib import Path
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str = ""
    DATABASE_ADMIN_URL: str | None = None
    JWT_SECRET: str = ""
    JWT_EXPIRY_MINUTES: int = Field(default=60)
    COOKIE_SECURE: bool = True
    CORS_ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:4173",
        "http://localhost:3000",
        "http://localhost:80",
        "http://localhost",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:4173",
    ]

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        if not value:
            raise ValueError("DATABASE_URL must be configured.")
        return value

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, value: str) -> str:
        if value == "change-me-in-production" or len(value) < 32:
            raise ValueError("JWT_SECRET must be set to a strong secret of at least 32 characters.")
        return value

    @field_validator("CORS_ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_cors_allowed_origins(cls, value):
        if value is None:
            return []
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("[") and value.endswith("]"):
                try:
                    parsed = json.loads(value)
                    if isinstance(parsed, list):
                        return [origin.strip().strip('"\'') for origin in parsed if isinstance(origin, str) and origin.strip()]
                except json.JSONDecodeError:
                    pass
            return [origin.strip().strip('"\'') for origin in value.replace('[', '').replace(']', '').split(',') if origin.strip()]
        return value

    def get_admin_url(self) -> str:
        return self.DATABASE_ADMIN_URL or self.DATABASE_URL


config = Settings()