from fastapi import APIRouter, Depends, Path
from asyncpg import Connection, PostgresError, RaiseError
from app.db import get_conn
from app.dependencies import CurrentUser, require_roles
from app.errors import NotFoundError, ConflictError, AppValidationError
from app.schemas.payments import RecordPaymentRequest, RecordPaymentResponse
from app.routers.invoices import fetch_invoice_by_id_or_code

router = APIRouter()

# ── Constants ──────────────────────────────────────────────────────────────────
# What the frontend sends
ALLOWED_PAYMENT_TYPES = {"Cash", "Card / POS", "LankaPay / QR"}

# Maps frontend label → DB payment_type_enum value
PAYMENT_TYPE_MAP = {
    "Cash":          "Cash",
    "Card / POS":    "Card",
    "LankaPay / QR": "Card",
}


@router.post("/{invoice_code}", response_model=RecordPaymentResponse)
async def record_payment(
    body: RecordPaymentRequest,
    invoice_code: str = Path(..., description="Invoice Code, e.g. INV-000001"),
    current_user: CurrentUser = Depends(require_roles("Receptionist")),
    conn: Connection = Depends(get_conn)
):
    """
    Record a payment against an invoice.

    Steps:
      1. Load the invoice by code.
      2. Calculate current outstanding balance server-side (never trust client).
      3. Validate amount and payment type.
      4. Map frontend payment label to DB enum value.
      5. Call fn_record_payment() to persist.
      6. Re-fetch updated status and return result.
    """

    # ── 1. Load invoice ────────────────────────────────────────────────────────
    inv = await fetch_invoice_by_id_or_code(conn, invoice_code)
    if not inv:
        raise NotFoundError(f"Invoice '{invoice_code}' not found.")

    invoice_id   = inv["invoice_id"]
    total_amount = float(inv["total_amount"])
    ins_amount   = float(inv["insurance_amount"])

    # ── 2. Calculate outstanding balance (server-side) ─────────────────────────
    paid_row = await conn.fetchrow(
        "SELECT COALESCE(SUM(amount_paid), 0) AS total_paid FROM payments WHERE invoice_id = $1",
        invoice_id
    )
    total_paid  = float(paid_row["total_paid"]) if paid_row else 0.0
    outstanding = max(0.0, round(total_amount - ins_amount - total_paid, 2))

    # ── 3. Validate ────────────────────────────────────────────────────────────
    if outstanding == 0:
        raise ConflictError("This invoice is already fully paid.")

    if body.payment_type not in ALLOWED_PAYMENT_TYPES:
        raise AppValidationError([{
            "field": "payment_type",
            "message": f"Invalid payment type. Must be one of: {', '.join(sorted(ALLOWED_PAYMENT_TYPES))}."
        }])

    if body.amount > outstanding:
        raise ConflictError(
            f"Amount ({body.amount:.2f}) exceeds outstanding balance ({outstanding:.2f})."
        )

    # ── 4. Map label → DB enum ─────────────────────────────────────────────────
    db_payment_type = PAYMENT_TYPE_MAP[body.payment_type]

    # ── 5. Persist via DB function ─────────────────────────────────────────────
    try:
        await conn.execute(
            "SELECT fn_record_payment($1::int, $2::numeric, $3::payment_type_enum)",
            invoice_id,
            body.amount,
            db_payment_type
        )
    except RaiseError as exc:
        raise ConflictError(str(exc))
    except PostgresError as exc:
        raise ConflictError(str(exc))

    # ── 6. Re-fetch updated state and return ───────────────────────────────────
    updated = await conn.fetchrow(
        "SELECT status FROM invoices WHERE invoice_id = $1", invoice_id
    )
    new_paid_row = await conn.fetchrow(
        "SELECT COALESCE(SUM(amount_paid), 0) AS total_paid FROM payments WHERE invoice_id = $1",
        invoice_id
    )
    total_paid = float(new_paid_row["total_paid"]) if new_paid_row else 0.0
    new_outstanding = max(0.0, round(total_amount - ins_amount - total_paid, 2))
    new_status = updated["status"] if updated else "Paid"

    msg = (
        "Invoice fully paid."
        if new_outstanding == 0
        else f"Payment recorded. Remaining balance: {new_outstanding:.2f}."
    )

    return RecordPaymentResponse(
        message=msg,
        invoice_code=inv["invoice_code"],
        amount_paid=body.amount,
        outstanding_balance=new_outstanding,
        status=new_status
    )
