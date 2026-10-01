import pytest

from app.config import Settings


def test_jwt_secret_rejects_default_placeholder_value():
    with pytest.raises(ValueError):
        Settings(
            DATABASE_URL="postgresql://user:pass@example/db",
            JWT_SECRET="change-me-in-production",
            JWT_EXPIRY_MINUTES=60,
        )


def test_cookie_secure_is_configurable():
    settings = Settings(
        DATABASE_URL="postgresql://user:pass@example/db",
        JWT_SECRET="abcdefghijklmnopqrstuvwxyz1234567890abcd",
        COOKIE_SECURE=False,
    )

    assert settings.COOKIE_SECURE is False
