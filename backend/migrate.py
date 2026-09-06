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

    files_to_run = [
        "../db/modules/01_auth_branch_staff.sql",
        "../db/seed/01_branches_staff.sql"
    ]

    for file_path in files_to_run:
        logger.info(f"Executing {file_path}...")
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                sql = f.read()
            await conn.execute(sql)
            logger.info(f"Successfully executed {file_path}")
        except Exception as e:
            logger.error(f"Error executing {file_path}: {e}")
            await conn.close()
            return

    await conn.close()
    logger.info("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
