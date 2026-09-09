import asyncio
import asyncpg
import os
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from the root .env file
load_dotenv(dotenv_path="../.env")


async def migrate():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL not found in .env")
        return

    logger.info("Connecting to the database...")
    try:
        conn = await asyncpg.connect(database_url)
        logger.info("Successfully connected to the database.")
    except Exception as e:
        logger.error(f"Failed to connect: {e}")
        return

    # Files in FK-safe execution order
    # Note: The entry point (01_auth_branch_staff.sql) uses \i which only works
    # with psql. For Python-based migration, we execute each file individually.
    files_to_run = [
        # Custom types
        ("CREATE TYPE gender_enum AS ENUM ('Male', 'Female', 'Other');", None),
        # Tables (FK order)
        (None, "../db/modules/dilantha/01_role.sql"),
        (None, "../db/modules/dilantha/02_branch.sql"),
        (None, "../db/modules/dilantha/03_app_user.sql"),
        (None, "../db/modules/dilantha/04_staff.sql"),
        # Functions and triggers
        (None, "../db/modules/dilantha/05_protection_functions.sql"),
        (None, "../db/modules/dilantha/06_auth_functions.sql"),
        # PostgreSQL roles and grants (may fail on hosted DBs without role creation privileges)
        (None, "../db/modules/dilantha/07_pg_roles.sql"),
        # Seed data
        (None, "../db/seed/01_branches_staff.sql"),
    ]

    for item in files_to_run:
        inline_sql, file_path = item

        if inline_sql:
            label = "inline SQL"
            sql = inline_sql
        else:
            label = file_path
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    sql = f.read()
            except FileNotFoundError:
                logger.error(f"File not found: {file_path}")
                await conn.close()
                return

        logger.info(f"Executing {label}...")
        try:
            await conn.execute(sql)
            logger.info(f"  ✓ {label}")
        except Exception as e:
            logger.error(f"  ✗ Error in {label}: {e}")
            # Continue with remaining files if it's a non-critical error (e.g., role creation on Neon)
            if file_path and "07_pg_roles" in file_path:
                logger.warning("  ⚠ Role creation may not be supported on managed databases — skipping.")
                continue
            await conn.close()
            return

    await conn.close()
    logger.info("Migration complete!")


if __name__ == "__main__":
    asyncio.run(migrate())
