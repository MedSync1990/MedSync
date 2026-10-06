import asyncio
import asyncpg
import os
from dotenv import load_dotenv

async def main():
    load_dotenv(dotenv_path="backend/.env")
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    
    base_where = """
        WHERE ($1::int IS NULL OR s.branch_id = $1)
          AND ($2::date IS NULL OR das.date = $2)
          AND ($3::text IS NULL OR a.status::text = $3)
          AND ($4::int IS NULL OR das.doctor_id = $4)
          AND ($5::int IS NULL OR a.patient_id = $5)
    """
    
    count_query = f"""
        SELECT COUNT(*)
        FROM appointments a
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        {base_where};
    """
    try:
        await conn.execute("SELECT set_config('app.current_role', 'Administrator', true)")
        await conn.fetchval(count_query, None, None, None, None, None)
        print("SUCCESS")
    except Exception as e:
        print("ERROR:", type(e).__name__, e)
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
