import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
import httpx
from fastapi import Depends, FastAPI, Response

from app import dependencies
from app.config import config
from app.errors import ForbiddenError, forbidden_exception_handler
from app.routers import auth
from app.schemas.auth import LoginRequest
from app.security import create_access_token, decode_access_token, require_csrf_token


@pytest.mark.parametrize("token", [None, "", "different-session", "é-invalid"])
def test_csrf_rejects_missing_and_mismatched_header(token):
    request = SimpleNamespace(headers={"x-csrf-token": token} if token is not None else {})
    with pytest.raises(ForbiddenError):
        require_csrf_token(request, "expected-token")


def test_csrf_checks_signed_session_value_not_readable_cookie():
    request = SimpleNamespace(headers={"x-csrf-token": "expected-token"}, cookies={})
    require_csrf_token(request, "expected-token")
    with pytest.raises(ForbiddenError):
        require_csrf_token(request, None)


def test_login_delivers_csrf_token_bound_to_jwt(monkeypatch):
    monkeypatch.setattr(auth, "verify_password", lambda *args: True)
    db = SimpleNamespace(fetchrow=AsyncMock(side_effect=[{
        "user_id": 6, "password_hash": "fixture", "branch_id": 1,
        "role_name": "Doctor", "is_active": True, "must_change_password": False,
    }, {"is_locked": False}]))
    response = Response()
    result = asyncio.run(auth.login(LoginRequest(username="doctor", password="fixture"), response, db))
    from http.cookies import SimpleCookie
    cookies = SimpleCookie()
    for value in response.headers.getlist("set-cookie"):
        cookies.load(value)
    payload = decode_access_token(cookies["access_token"].value)
    assert payload["csrf_token"] == result.csrf_token
    assert cookies["csrf_token"].value == result.csrf_token
    assert response.headers["cache-control"] == "no-store"


def test_auth_me_returns_session_csrf_token_after_reload():
    user = dependencies.CurrentUser(6, "Doctor", 1, "doctor", "session-token")
    db = SimpleNamespace(
        fetchval=AsyncMock(side_effect=[True, False]),
        fetchrow=AsyncMock(side_effect=[{"name": "Colombo"}, {"first_name": "Jean", "last_name": "Grey"}]),
    )
    response = Response()
    result = asyncio.run(auth.get_me(response, user, db))
    assert result.csrf_token == "session-token"
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("method", ["POST", "PUT", "PATCH", "DELETE"])
@pytest.mark.parametrize("origin,token,expected", [
    ("https://frontend.example", "session-token", 200),
    ("https://frontend.example", None, 403),
    ("https://frontend.example", "another-session-token", 403),
    ("https://attacker.example", "session-token", 403),
    (None, "session-token", 403),
])
def test_cookie_http_requests_need_trusted_origin_and_session_token(monkeypatch, method, origin, token, expected):
    monkeypatch.setattr(config, "CORS_ALLOWED_ORIGINS", ["https://frontend.example"])
    app = FastAPI()

    class Pool:
        def acquire(self):
            return self
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return False
        async def fetchval(self, *args):
            return True

    app.state.pool = Pool()
    app.add_exception_handler(ForbiddenError, forbidden_exception_handler)

    @app.api_route("/mutation", methods=["POST", "PUT", "PATCH", "DELETE"])
    async def mutation(user=Depends(dependencies.get_current_user)):
        return {"user_id": user.user_id}

    jwt = create_access_token({"user_id": 6, "role": "Doctor", "branch_id": 1,
                               "username": "doctor", "csrf_token": "session-token"})
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="https://api.example",
                                     cookies={"access_token": jwt}) as client:
            headers = {}
            if origin is not None:
                headers["Origin"] = origin
            if token is not None:
                headers["X-CSRF-Token"] = token
            response = await client.request(method, "/mutation", headers=headers)
            assert response.status_code == expected
    asyncio.run(run())
