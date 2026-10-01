import asyncio
import asyncpg
import os
from dotenv import load_dotenv

async def main():
    load_dotenv(dotenv_path="backend/.env")
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    
    query = """
    SELECT tgname, relname as tablename, pg_get_triggerdef(t.oid) as trigger_def
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE schemaname = 'public' AND tgisinternal = false;
    """
    try:
        rows = await conn.fetch(query)
        for r in rows:
            print(dict(r))
    except Exception as e:
        query = """
        SELECT tgname, relname as tablename, pg_get_triggerdef(t.oid) as trigger_def
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' AND t.tgisinternal = false;
        """
        rows = await conn.fetch(query)
        for r in rows:
            print(dict(r))
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
