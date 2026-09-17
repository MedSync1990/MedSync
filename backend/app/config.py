# app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    DATABASE_ADMIN_URL: Optional[str] = None
    JWT_SECRET: str = Field(default="change-me-in-production")
    JWT_EXPIRY_MINUTES: int = Field(default=60)
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    
    def get_admin_url(self) -> str:
        return self.DATABASE_ADMIN_URL if self.DATABASE_ADMIN_URL else self.DATABASE_URL

config = Settings()