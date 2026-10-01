import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

async def main():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    row = await conn.fetchrow("SELECT invoice_id, invoice_code, total_amount, insurance_amount, status FROM invoices WHERE invoice_code = 'INV-000005'")
    print("Invoice:", dict(row) if row else "Not Found")
    if row:
        payments = await conn.fetch("SELECT * FROM payments WHERE invoice_id = $1", row['invoice_id'])
        print("Payments:", [dict(p) for p in payments])
    await conn.close()

asyncio.run(main())
