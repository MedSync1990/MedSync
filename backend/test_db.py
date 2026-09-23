import asyncio
import os
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).with_name(".env"))
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set in backend/.env")

async def run():
    conn = await asyncpg.connect(DATABASE_URL)
    identifier = "2"
    search_type = "nic"
    is_numeric = identifier.isdigit()
    int_val = int(identifier) if is_numeric else 0
    query = """
        SELECT i.invoice_id
        FROM invoices i
        JOIN appointments a ON i.appointment_id = a.appointment_id
        JOIN patient p ON a.patient_id = p.user_id
        JOIN app_user pu ON p.user_id = pu.user_id
        WHERE ($1::boolean AND $4::text != 'nic' AND i.invoice_id = $2::int)
           OR ($4::text != 'nic' AND UPPER(i.invoice_code) = UPPER($3::text))
           OR ($4::text = 'nic' AND UPPER(pu.id_number) = UPPER($3::text))
    """
    row = await conn.fetchrow(query, is_numeric, int_val, identifier, search_type)
    print("Row for type=nic:", dict(row) if row else None)

    row2 = await conn.fetchrow(query, is_numeric, int_val, identifier, "invoice")
    print("Row for type=invoice:", dict(row2) if row2 else None)

asyncio.run(run())
