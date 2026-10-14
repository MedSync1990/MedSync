import asyncio
from unittest.mock import AsyncMock
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.dependencies import CurrentUser
from app.routers.staff import reset_staff_password
from app.security import verify_password


@pytest.mark.parametrize("role", ["Administrator", "Branch Manager"])
def test_reset_uses_default_password_and_requires_password_change(role):
    db = SimpleNamespace(fetchval=AsyncMock(return_value=1), execute=AsyncMock())
    user = CurrentUser(user_id=1, role=role, branch_id=1, username="manager")

    result = asyncio.run(reset_staff_password(6, user, db))

    assert result["temporary_password"] == "medsync"
    query, password_hash, user_id = db.execute.call_args.args
    assert verify_password("medsync", password_hash)
    assert password_hash != "medsync"
    assert "must_change_password = TRUE" in query
    assert user_id == 6


def test_manager_cannot_reset_another_branch_password():
    db = SimpleNamespace(fetchval=AsyncMock(return_value=2), execute=AsyncMock())
    user = CurrentUser(user_id=1, role="Branch Manager", branch_id=1, username="manager")

    with pytest.raises(HTTPException) as exc:
        asyncio.run(reset_staff_password(6, user, db))

    assert exc.value.status_code == 403
    db.execute.assert_not_called()
