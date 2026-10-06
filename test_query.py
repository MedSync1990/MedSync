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
    
    data_query = f"""
        SELECT
            a.appointment_id,
            a.appointment_code,
            a.patient_id,
            TRIM(CONCAT(pu.first_name, ' ', COALESCE(pu.middle_name || ' ', ''), pu.last_name)) AS patient_name,
            das.doctor_id,
            TRIM(CONCAT(du.first_name, ' ', COALESCE(du.middle_name || ' ', ''), du.last_name)) AS doctor_name,
            s.branch_id,
            b.name AS branch_name,
            a.slot_id,
            das.date AS appointment_date,
            das.start_time,
            das.end_time,
            a.appointment_type,
            a.status,
            a.created_at
        FROM appointments a
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        JOIN branch b ON s.branch_id = b.branch_id
        JOIN app_user pu ON a.patient_id = pu.user_id
        JOIN app_user du ON das.doctor_id = du.user_id
        {base_where}
        ORDER BY das.date DESC, das.start_time DESC
        LIMIT $6 OFFSET $7;
    """
    try:
        await conn.execute("SELECT set_config('app.current_role', 'Administrator', true)")
        await conn.fetch(data_query, None, None, None, None, None, 25, 0)
        print("SUCCESS")
    except Exception as e:
        print("ERROR:", e)
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
