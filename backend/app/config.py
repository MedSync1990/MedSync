# app/config.py
from pathlib import Path
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str
    DATABASE_ADMIN_URL: Optional[str] = None
    JWT_SECRET: str = Field(default="change-me-in-production")
    JWT_EXPIRY_MINUTES: int = Field(default=60)
    COOKIE_SECURE: bool = True
    CORS_ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000", "http://localhost:80", "http://localhost"]

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

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
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    def get_admin_url(self) -> str:
        return self.DATABASE_ADMIN_URL if self.DATABASE_ADMIN_URL else self.DATABASE_URL


config = Settings()