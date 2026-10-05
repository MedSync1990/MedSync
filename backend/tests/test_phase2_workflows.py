import pytest
import pytest_asyncio
import asyncpg

from app.config import config
from app.dependencies import CurrentUser
from app.errors import ConflictError
from app.routers.appointments import complete_appointment
from app.routers.treatments import (
    create_treatment,
    deactivate_treatment,
    update_treatment,
)
from app.schemas.appointments import AppointmentCompleteRequest
from app.schemas.treatments import TreatmentCreateRequest, TreatmentUpdateRequest


class _Rollback(Exception):
    pass


@pytest_asyncio.fixture
async def conn():
    try:
        connection = await asyncpg.connect(config.DATABASE_URL)
    except Exception as exc:
        pytest.skip(f"Database unavailable: {exc}")

    try:
        async with connection.transaction():
            yield connection
            raise _Rollback
    except _Rollback:
        pass
    finally:
        await connection.close()


@pytest.fixture
def admin_user():
    return CurrentUser(user_id=1, role="Administrator", branch_id=None, username="admin1")


@pytest.fixture
def doctor_user():
    return CurrentUser(user_id=6, role="Doctor", branch_id=1, username="doctor1")


@pytest.mark.asyncio
async def test_treatment_create_update_and_deactivate(conn, admin_user):
    created = await create_treatment(
        TreatmentCreateRequest(
            treatment_name="Test Treatment",
            category="Diagnostic",
            price="1234.50",
            is_eligible_for_insurance=True,
        ),
        conn,
        admin_user,
    )
    assert created.treatment_name == "Test Treatment"
    assert created.is_active is True

    updated = await update_treatment(
        created.treatment_code,
        TreatmentUpdateRequest(
            treatment_name="Updated Test Treatment",
            category="Procedure",
            price="1500.00",
            is_eligible_for_insurance=False,
        ),
        conn,
        admin_user,
    )
    assert updated.treatment_name == "Updated Test Treatment"
    assert str(updated.price) == "1500.00"
    assert updated.is_eligible_for_insurance is False

    result = await deactivate_treatment(created.treatment_code, conn, admin_user)
    assert result["treatment_code"] == created.treatment_code
    row = await conn.fetchrow(
        "SELECT is_active FROM treatment_catalogue WHERE treatment_code = $1",
        created.treatment_code,
    )
    assert row["is_active"] is False


async def _scheduled_appointment(conn, doctor_id=6):
    row = await conn.fetchrow(
        """
        SELECT a.appointment_id
        FROM appointments a
        JOIN doctor_availability_slots das ON das.slot_id = a.slot_id
        WHERE a.status = 'Scheduled' AND das.doctor_id = $1
        ORDER BY a.appointment_id
        LIMIT 1
        """,
        doctor_id,
    )
    if not row:
        pytest.skip("No scheduled appointment available for completion tests")
    return row["appointment_id"]


@pytest.mark.asyncio
async def test_appointment_completion_generates_invoice_and_snapshots_price(conn, doctor_user):
    appointment_id = await _scheduled_appointment(conn, doctor_user.user_id)
    treatment_code = 5
    treatment_price = await conn.fetchval(
        "SELECT price FROM treatment_catalogue WHERE treatment_code = $1 AND is_active",
        treatment_code,
    )

    response = await complete_appointment(
        appointment_id,
        AppointmentCompleteRequest(
            diagnosis="Test diagnosis",
            consultation_notes="Test consultation notes",
            treatments=[{"treatment_id": treatment_code, "quantity": 1}],
        ),
        conn,
        doctor_user,
    )

    assert response.appointment_id == appointment_id
    assert response.invoice_id is not None
    assert await conn.fetchval(
        "SELECT status::text FROM appointments WHERE appointment_id = $1",
        appointment_id,
    ) == "Completed"
    line = await conn.fetchrow(
        """
        SELECT i.total_amount, ct.unit_price, ct.quantity
        FROM invoices i
        JOIN consultations c ON c.appointment_id = i.appointment_id
        JOIN consultation_treatments ct ON ct.consultation_id = c.consultation_id
        WHERE i.invoice_id = $1 AND ct.treatment_code = $2
        """,
        response.invoice_id,
        treatment_code,
    )
    assert line["quantity"] == 1
    assert line["unit_price"] == treatment_price
    assert line["total_amount"] == treatment_price


@pytest.mark.asyncio
async def test_completion_without_consultation_notes_is_rejected():
    with pytest.raises(ValueError):
        AppointmentCompleteRequest(
            diagnosis="Test diagnosis",
            consultation_notes="",
            treatments=[],
        )


@pytest.mark.asyncio
async def test_completion_with_invalid_treatment_is_rejected(conn, doctor_user):
    appointment_id = await _scheduled_appointment(conn, doctor_user.user_id)
    with pytest.raises(ConflictError):
        await complete_appointment(
            appointment_id,
            AppointmentCompleteRequest(
                diagnosis="Test diagnosis",
                consultation_notes="Test consultation notes",
                treatments=[{"treatment_id": 999999, "quantity": 1}],
            ),
            conn,
            doctor_user,
        )


@pytest.mark.asyncio
async def test_completing_already_completed_appointment_is_rejected(conn, doctor_user):
    row = await conn.fetchrow(
        """
        SELECT a.appointment_id
        FROM appointments a
        JOIN doctor_availability_slots das ON das.slot_id = a.slot_id
        WHERE a.status = 'Completed' AND das.doctor_id = $1
        ORDER BY a.appointment_id
        LIMIT 1
        """,
        doctor_user.user_id,
    )
    if not row:
        pytest.skip("No completed appointment available for completion tests")

    with pytest.raises(ConflictError):
        await complete_appointment(
            row["appointment_id"],
            AppointmentCompleteRequest(
                diagnosis="Second diagnosis",
                consultation_notes="Second completion attempt",
                treatments=[],
            ),
            conn,
            doctor_user,
        )
