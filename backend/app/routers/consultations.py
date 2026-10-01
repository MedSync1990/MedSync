from fastapi import APIRouter, Depends
from asyncpg import Connection

from app.db import get_conn
from app.dependencies import require_roles
from app.schemas.consultations import (
    AppointmentCompleteRequest,
    AppointmentCompleteResponse,
    ConsultationDetailResponse,
)
from app.routers.appointments import (
    complete_appointment as appt_complete,
    get_appointment_consultation as appt_get_consultation,
)

router = APIRouter()


@router.put(
    "/{appointment_id}/complete",
    response_model=AppointmentCompleteResponse,
    dependencies=[Depends(require_roles("Doctor", "Administrator"))],
    summary="Complete consultation appointment and generate invoice (alias)",
)
async def complete_consultation(
    appointment_id: int,
    payload: AppointmentCompleteRequest,
    conn: Connection = Depends(get_conn),
):
    return await appt_complete(appointment_id, payload, conn)


@router.get(
    "/{appointment_id}",
    response_model=ConsultationDetailResponse,
    dependencies=[Depends(require_roles("Doctor", "Receptionist", "Administrator", "Branch Manager"))],
    summary="Get consultation clinical notes and treatments by appointment ID",
)
async def get_consultation(
    appointment_id: int,
    conn: Connection = Depends(get_conn),
):
    return await appt_get_consultation(appointment_id, conn)
