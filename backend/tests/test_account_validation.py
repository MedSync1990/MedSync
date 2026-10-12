import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app import dependencies
from app.errors import UnauthorizedError


class FakePool:
    def __init__(self, active=True, error=False):
        self.active = active
        self.error = error

    def acquire(self):
        return self

    async def __aenter__(self):
        if self.error:
            raise RuntimeError("Database unavailable")
        return self

    async def __aexit__(self, *args):
        return False

    async def fetchval(self, query, user_id):
        return self.active


@pytest.mark.parametrize(
    "user_id,pool,expected",
    [
        (42, FakePool(), None),
        (42, FakePool(active=False), UnauthorizedError),
        (42, FakePool(active=None), UnauthorizedError),
        (None, FakePool(), UnauthorizedError),
        (42, None, HTTPException),
        (42, FakePool(error=True), HTTPException),
    ],
)
def test_account_validation_fails_closed(monkeypatch, user_id, pool, expected):
    monkeypatch.setattr(
        dependencies,
        "decode_access_token",
        lambda token: dict(user_id=user_id, role="Doctor", branch_id=7, username="audit"),
    )
    request = SimpleNamespace(
        cookies={"access_token": "dummy"},
        headers={},
        method="GET",
        app=SimpleNamespace(state=SimpleNamespace(pool=pool)),
        state=SimpleNamespace(),
    )
    if expected is None:
        user = asyncio.run(dependencies.get_current_user(request, creds=None))
        assert user.user_id == 42
        assert request.state.user is user
    else:
        with pytest.raises(expected) as error:
            asyncio.run(dependencies.get_current_user(request, creds=None))
        if expected is HTTPException:
            assert error.value.status_code == 503
        assert not hasattr(request.state, "user")
