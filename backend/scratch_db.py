import asyncio
import asyncpg
import os
from dotenv import load_dotenv

async def clean_duplicates():
    load_dotenv(dotenv_path=".env")
    database_url = os.getenv("DATABASE_URL")
    conn = await asyncpg.connect(database_url)
    
    # Clean duplicates in treatment_catalogue
    await conn.execute("""
        DELETE FROM treatment_catalogue 
        WHERE treatment_code NOT IN (
            SELECT MIN(treatment_code) 
            FROM treatment_catalogue 
            GROUP BY treatment_name
        );
    """)
    print("Duplicates cleaned.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(clean_duplicates())
