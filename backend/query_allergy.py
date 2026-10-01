import asyncio
import asyncpg
import os
from dotenv import load_dotenv

async def main():
    load_dotenv(dotenv_path=".env")
    database_url = os.getenv("DATABASE_URL")
    conn = await asyncpg.connect(database_url)
    
    # Check triggers
    rows = await conn.fetch("SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'allergy'::regclass;")
    print("Triggers:", rows)

    # Check rules
    rows = await conn.fetch("SELECT rulename, ev_type, is_instead FROM pg_rewrite WHERE ev_class = 'allergy'::regclass;")
    print("Rules:", rows)
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
