from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    DATABASE_URL: str
    DATABASE_ADMIN_URL: str
    JWT_SECRET: str
    JWT_EXPIRY_MINUTES: int = Field(default=60)
    COOKIE_SECURE: bool = Field(default=False)  # True only once served over HTTPS

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    def get_admin_url(self) -> str:
        return self.DATABASE_ADMIN_URL

config = Settings()