import asyncio
import asyncpg
import os
from dotenv import load_dotenv

async def main():
    load_dotenv(dotenv_path="backend/.env")
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    
    query = """
    SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
    FROM pg_policies;
    """
    rows = await conn.fetch(query)
    for r in rows:
        print(dict(r))
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
