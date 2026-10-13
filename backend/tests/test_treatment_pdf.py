"""Exercise the real PDF renderer with cookie auth and a deterministic DB fixture.

Run in the production image from /tmp with PYTHONPATH=/app to cover packaged
assets and working-directory independence without a database or host mounts.
"""
from datetime import date
from decimal import Decimal
import logging
from pathlib import Path
import shutil

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from app.db import get_conn
from app.errors import (
    ForbiddenError, UnauthorizedError,
    forbidden_exception_handler, unauthorized_exception_handler,
)
from app.routers import reports
from app.security import create_access_token


class ReportConnection:
    def __init__(self, records):
        self.records = records
        self.arguments = None

    async def fetch(self, query, *args):
        self.arguments = args
        return self.records


class ActiveAccountPool:
    """Exercise cookie/JWT authentication without accessing a real database."""

    def __init__(self, active=True):
        self.active = active

    def acquire(self):
        return self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def fetchval(self, query, user_id):
        assert "SELECT is_active FROM staff" in query
        assert user_id == 1
        return self.active


def make_app(records, active=True):
    connection = ReportConnection(records)
    app = FastAPI()
    app.state.pool = ActiveAccountPool(active)
    app.include_router(reports.router, prefix="/api/v1/reports")
    app.add_exception_handler(UnauthorizedError, unauthorized_exception_handler)
    app.add_exception_handler(ForbiddenError, forbidden_exception_handler)

    async def database():
        yield connection

    app.dependency_overrides[get_conn] = database
    return app, connection


def make_client(records, role="Branch Manager", active=True):
    app, connection = make_app(records, active)
    client = TestClient(app)
    client.cookies.set("access_token", create_access_token({
        "user_id": 1, "role": role, "branch_id": 1, "username": "PDF Test",
    }))
    return client, connection


def make_smoke_app():
    """Uvicorn factory for a production-image HTTP check using synthetic data.

    This factory is test-only and never included by Dockerfile's COPY app.
    Authentication still verifies a signed cookie and the active-account query.
    """
    records = [{
        "treatment_code": f"T-{i}", "treatment_item": f"Sample procedure {i}",
        "category": category, "is_active": True,
        "usage_count": i + 1, "total_revenue": Decimal("1200.00") * (i + 1),
    } for i, category in enumerate(["Diagnostics", "Consultation", "Laboratory"], 1)]
    return make_app(records)[0]


@pytest.mark.parametrize("relocate_assets", [False, True])
@pytest.mark.parametrize("item_count", [0, 3, 45])
@pytest.mark.parametrize("role, expected_branch", [
    ("Branch Manager", 1), ("Administrator", 9),
])
def test_pdf_uses_packaged_logo_from_any_directory(
    tmp_path, monkeypatch, caplog, item_count, role, expected_branch, relocate_assets,
):
    records = [{
        "treatment_code": f"T-{i}", "treatment_item": f"Sample procedure {i}",
        "category": "Diagnostics", "is_active": True,
        "usage_count": 2, "total_revenue": Decimal("1200.00"),
    } for i in range(item_count)]
    # Reproduce Docker's app-only packaging, with no backend/medsync.webp.
    if relocate_assets:
        packaged_app = tmp_path / "package" / "app"
        shutil.copytree(
            Path(reports.__file__).resolve().parent.parent / "templates",
            packaged_app / "templates",
        )
        monkeypatch.setattr(reports, "__file__", str(packaged_app / "routers" / "reports.py"))
    monkeypatch.chdir(tmp_path)
    caplog.set_level(logging.ERROR, logger="weasyprint")
    client, connection = make_client(records, role)
    with client:
        response = client.get("/api/v1/reports/treatment-categories/pdf", params={
            "branch_id": 9, "start_date": "2026-09-01", "end_date": "2026-09-30",
        })

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment; filename=Treatment_Report.pdf" == response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF-")
    # A valid PDF alone can hide a failed logo. Require an embedded raster image.
    assert b"/Subtype /Image" in response.content
    assert not [r for r in caplog.records if r.name.startswith("weasyprint") and r.levelno >= logging.ERROR]
    assert connection.arguments == (expected_branch, date(2026, 9, 1), date(2026, 9, 30))
    (tmp_path / f"treatment-{role.replace(' ', '-')}-{item_count}.pdf").write_bytes(response.content)


def test_pdf_requires_authorized_cookie():
    client, connection = make_client([], "Receptionist")
    with client:
        assert client.get("/api/v1/reports/treatment-categories/pdf").status_code == 403
        client.cookies.clear()
        assert client.get("/api/v1/reports/treatment-categories/pdf").status_code == 401
    assert connection.arguments is None


def test_pdf_rejects_inactive_account():
    client, connection = make_client([], active=False)
    with client:
        assert client.get("/api/v1/reports/treatment-categories/pdf").status_code == 401
    assert connection.arguments is None


def test_pdf_rejects_invalid_cookie():
    client, connection = make_client([])
    client.cookies.set("access_token", "invalid-token")
    with client:
        assert client.get("/api/v1/reports/treatment-categories/pdf").status_code == 401
    assert connection.arguments is None
