import asyncio
import asyncpg
import os
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv(dotenv_path="../.env")

async def verify():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL not found in .env")
        return

    conn = await asyncpg.connect(database_url)

    # Check tables exist
    tables = await conn.fetch("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """)
    logger.info(f"Tables found: {[t['table_name'] for t in tables]}")

    # Check row counts
    for table_name in ['ROLE', 'BRANCH', 'USER', 'STAFF']:
        count = await conn.fetchval(f'SELECT COUNT(*) FROM "{table_name}"')
        logger.info(f"  {table_name}: {count} rows")

    # Check columns for each table
    for table_name in ['ROLE', 'BRANCH', 'USER', 'STAFF']:
        cols = await conn.fetch("""
            SELECT column_name, data_type FROM information_schema.columns
            WHERE table_name = $1 AND table_schema = 'public'
            ORDER BY ordinal_position;
        """, table_name)
        logger.info(f"  {table_name} columns: {[(c['column_name'], c['data_type']) for c in cols]}")

    # Verify password is hashed (not plaintext)
    sample = await conn.fetchval('SELECT password FROM "STAFF" LIMIT 1')
    if sample and sample.startswith('$2'):
        logger.info("  Passwords are bcrypt-hashed correctly!")
    else:
        logger.warning(f"  Password may not be hashed: {sample[:20]}...")

    await conn.close()
    logger.info("Verification complete!")

if __name__ == "__main__":
    asyncio.run(verify())
