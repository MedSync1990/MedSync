import pytest
from fastapi import Depends, FastAPI, Response
from fastapi.testclient import TestClient

from app import dependencies
from app.config import config
from app.db import get_conn
from app.errors import ForbiddenError, forbidden_exception_handler
from app.routers import auth


TRUSTED_ORIGIN = "https://frontend.example"


class FakePool:
    def acquire(self):
        return self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def fetchval(self, *args):
        return True


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(config, "CORS_ALLOWED_ORIGINS", [TRUSTED_ORIGIN])
    monkeypatch.setattr(dependencies, "decode_access_token", lambda token: {
        "user_id": 42, "role": "Administrator", "branch_id": None, "username": "test",
    })
    app = FastAPI()
    app.state.pool = FakePool()
    app.add_exception_handler(ForbiddenError, forbidden_exception_handler)
    app.include_router(auth.router, prefix="/auth")

    async def login_db():
        # Rejecting an untrusted login must happen before its DB dependency.
        raise AssertionError("Login reached the database")

    app.dependency_overrides[get_conn] = login_db

    @app.api_route("/staff", methods=["POST", "PUT", "PATCH", "DELETE"])
    async def mutation(user=Depends(dependencies.get_current_user)):
        return {"user_id": user.user_id}

    @app.get("/download")
    async def download(user=Depends(dependencies.get_current_user)):
        return Response(b"download fixture", media_type="application/pdf",
                        headers={"Content-Disposition": "attachment; filename=test.pdf"})

    return TestClient(app)


@pytest.mark.parametrize("method", ["POST", "PUT", "PATCH", "DELETE"])
@pytest.mark.parametrize("origin", [None, "null", "https://attacker.invalid", TRUSTED_ORIGIN + ".attacker.invalid"])
@pytest.mark.parametrize("referer", ["https://attacker.invalid/docs", "https://attacker.invalid/redoc"])
def test_cookie_mutations_reject_untrusted_origins(client, method, origin, referer):
    client.cookies.set("access_token", "fixture")
    client.cookies.set("csrf_token", "matching-token")
    headers = {"Referer": referer, "X-CSRF-Token": "matching-token",
               "Authorization": "Bearer fixture"}
    if origin is not None:
        headers["Origin"] = origin
    assert client.request(method, "/staff", headers=headers).status_code == 403


@pytest.mark.parametrize("method", ["POST", "PUT", "PATCH", "DELETE"])
def test_cookie_mutations_allow_exact_trusted_origin_without_csrf_token(client, method):
    client.cookies.set("access_token", "fixture")
    assert client.request(method, "/staff", headers={"Origin": TRUSTED_ORIGIN}).status_code == 200


def test_bearer_only_client_needs_no_browser_origin(client):
    assert client.post("/staff", headers={"Authorization": "Bearer fixture"}).status_code == 200


@pytest.mark.parametrize("origin", [None, "null", "https://attacker.invalid"])
@pytest.mark.parametrize("path", ["/auth/login", "/auth/logout"])
def test_auth_mutations_reject_untrusted_origin_without_existing_session(client, origin, path):
    headers = {"Referer": "https://attacker.invalid/docs"}
    if origin is not None:
        headers["Origin"] = origin
    response = client.post(path, headers=headers, json={"username": "test", "password": "fixture"})
    assert response.status_code == 403


def test_trusted_login_passes_origin_check(client):
    class LoginDB:
        async def fetchrow(self, *args):
            return None

    client.app.dependency_overrides[get_conn] = lambda: LoginDB()
    response = client.post("/auth/login", headers={"Origin": TRUSTED_ORIGIN},
                           json={"username": "test", "password": "fixture"})
    assert response.status_code == 401  # Invalid credentials, not an Origin rejection.


def test_trusted_logout_clears_cookies(client):
    response = client.post("/auth/logout", headers={"Origin": TRUSTED_ORIGIN})
    assert response.status_code == 200
    assert all("Max-Age=0" in cookie for cookie in response.headers.get_list("set-cookie"))


def test_authenticated_download_needs_no_origin_or_csrf_token(client):
    client.cookies.set("access_token", "fixture")
    response = client.get("/download")
    assert response.status_code == 200
    assert response.content == b"download fixture"
    assert "attachment" in response.headers["content-disposition"]


@pytest.mark.parametrize('secure', [False, True])
def test_logout_cookie_deletion_matches_login_attributes(client, monkeypatch, secure):
    monkeypatch.setattr(config, 'COOKIE_SECURE', secure)
    response = client.post('/auth/logout', headers={'Origin': TRUSTED_ORIGIN})
    cookies = response.headers.get_list('set-cookie')
    assert len(cookies) == 2
    for cookie in cookies:
        assert 'Max-Age=0' in cookie
        assert 'Path=/' in cookie
        assert ('Secure' in cookie) == secure
        assert f'SameSite={"none" if secure else "lax"}' in cookie
    assert 'HttpOnly' in cookies[0]
