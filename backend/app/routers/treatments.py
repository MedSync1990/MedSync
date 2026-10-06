from decimal import Decimal
from typing import List

from asyncpg import Connection, PostgresError
from fastapi import APIRouter, Depends, Query, status

from app.dependencies import CurrentUser, get_db, require_roles
from app.errors import ConflictError, NotFoundError
from app.schemas.treatments import (
	TreatmentCreateRequest,
	TreatmentResponse,
	TreatmentUpdateRequest,
)

router = APIRouter()


def _to_response(row) -> TreatmentResponse:
	return TreatmentResponse(
		treatment_code=row["treatment_code"],
		treatment_name=row["treatment_name"],
		category=row["category"],
		price=Decimal(row["price"]),
		is_eligible_for_insurance=row["is_eligible_for_insurance"],
		is_active=row["is_active"],
	)


@router.get("", response_model=List[TreatmentResponse])
async def list_treatments(
	include_inactive: bool = Query(True),
	conn: Connection = Depends(get_db),
	_: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Doctor", "Receptionist")),
):
	rows = await conn.fetch(
		"""
		SELECT treatment_code, treatment_name, category, price,
			   is_eligible_for_insurance, is_active
		FROM treatment_catalogue
		WHERE ($1::boolean OR is_active)
		ORDER BY is_active DESC, category ASC, treatment_name ASC
		""",
		include_inactive,
	)
	return [_to_response(row) for row in rows]


@router.get("/{code}", response_model=TreatmentResponse)
async def get_treatment(
	code: int,
	conn: Connection = Depends(get_db),
	_: CurrentUser = Depends(require_roles("Administrator", "Branch Manager", "Doctor", "Receptionist")),
):
	row = await conn.fetchrow(
		"""
		SELECT treatment_code, treatment_name, category, price,
			   is_eligible_for_insurance, is_active
		FROM treatment_catalogue
		WHERE treatment_code = $1
		""",
		code,
	)
	if not row:
		raise NotFoundError("Treatment not found.")
	return _to_response(row)


@router.post("", response_model=TreatmentResponse, status_code=status.HTTP_201_CREATED)
async def create_treatment(
	payload: TreatmentCreateRequest,
	conn: Connection = Depends(get_db),
	_: CurrentUser = Depends(require_roles("Administrator", "Branch Manager")),
):
	row = await conn.fetchrow(
		"""
		INSERT INTO treatment_catalogue
			(treatment_name, category, price, is_eligible_for_insurance)
		VALUES ($1, $2, $3, $4)
		RETURNING treatment_code, treatment_name, category, price,
				  is_eligible_for_insurance, is_active
		""",
		payload.treatment_name,
		payload.category,
		payload.price,
		payload.is_eligible_for_insurance,
	)
	return _to_response(row)


@router.put("/{code}", response_model=TreatmentResponse)
async def update_treatment(
	code: int,
	payload: TreatmentUpdateRequest,
	conn: Connection = Depends(get_db),
	_: CurrentUser = Depends(require_roles("Administrator", "Branch Manager")),
):
	row = await conn.fetchrow(
		"""
		UPDATE treatment_catalogue
		SET treatment_name = $2,
			category = $3,
			price = $4,
			is_eligible_for_insurance = $5
		WHERE treatment_code = $1
		RETURNING treatment_code, treatment_name, category, price,
				  is_eligible_for_insurance, is_active
		""",
		code,
		payload.treatment_name,
		payload.category,
		payload.price,
		payload.is_eligible_for_insurance,
	)
	if not row:
		raise NotFoundError("Treatment not found.")
	return _to_response(row)


@router.put("/{code}/deactivate")
async def deactivate_treatment(
	code: int,
	conn: Connection = Depends(get_db),
	_: CurrentUser = Depends(require_roles("Administrator", "Branch Manager")),
):
	exists = await conn.fetchval(
		"SELECT 1 FROM treatment_catalogue WHERE treatment_code = $1",
		code,
	)
	if not exists:
		raise NotFoundError("Treatment not found.")

	try:
		await conn.execute("SELECT fn_deactivate_treatment($1)", code)
	except PostgresError as exc:
		raise ConflictError("Treatment could not be deactivated.") from exc

	return {"message": "Treatment deactivated successfully.", "treatment_code": code}

