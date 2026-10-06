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
            a.appointment_id
        FROM appointments a
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        JOIN branch b ON s.branch_id = b.branch_id
        JOIN app_user pu ON a.patient_id = pu.user_id
        JOIN app_user du ON das.doctor_id = du.user_id
        {base_where}
        LIMIT $6 OFFSET $7;
    """
    roles = ['Administrator', 'Receptionist', 'Doctor', 'Branch Manager']
    for role in roles:
        try:
            await conn.execute(f"SELECT set_config('app.current_role', '{role}', true)")
            if role in ['Doctor', 'Branch Manager', 'Receptionist']:
                # Mock a user id and branch id
                await conn.execute("SELECT set_config('app.current_user_id', '11', true)")
                await conn.execute("SELECT set_config('app.current_branch_id', '1', true)")
            
            await conn.fetch(data_query, None, None, None, None, None, 25, 0)
            print(f"SUCCESS for {role}")
        except Exception as e:
            print(f"ERROR for {role}:", e)
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
