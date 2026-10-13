import asyncio
import argparse
import asyncpg
import os
from dotenv import load_dotenv
import logging
import re
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load the backend environment regardless of the current working directory.
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=ROOT_DIR / "backend" / ".env")


INCLUDE_PATTERN = re.compile(r"^\s*\\(i|ir)\s+(.+?)\s*$")
PSQL_META_PATTERN = re.compile(r"^\s*\\echo(?:\s+.*)?$")
TRANSACTION_CONTROL_PATTERN = re.compile(r"^\s*(BEGIN|COMMIT|ROLLBACK)\s*;\s*$", re.IGNORECASE)


def expand_psql_file(file_path: str, include_stack: tuple[Path, ...] = ()) -> str:
    """Expand the psql include commands used by the repository SQL files."""
    path = ROOT_DIR / file_path
    if path in include_stack:
        chain = " -> ".join(str(item.relative_to(ROOT_DIR)) for item in (*include_stack, path))
        raise RuntimeError(f"Circular SQL include detected: {chain}")

    try:
        source = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        raise RuntimeError(f"SQL file not found: {file_path}") from None

    expanded: list[str] = []
    for line in source.splitlines():
        if PSQL_META_PATTERN.match(line) or TRANSACTION_CONTROL_PATTERN.match(line):
            continue

        include_match = INCLUDE_PATTERN.match(line)
        if not include_match:
            expanded.append(line)
            continue

        include_kind, include_target = include_match.groups()
        include_path = Path(include_target.strip().strip('"'))
        if include_kind == "ir":
            include_path = path.parent / include_path
        expanded.append(expand_psql_file(str(include_path), (*include_stack, path)))

    return "\n".join(expanded)


async def migrate(seed_only: bool = False):
    # Schema creation and clinical demo inserts require owner/admin privileges.
    database_url = os.getenv("DATABASE_ADMIN_URL") or os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_ADMIN_URL or DATABASE_URL must be configured.")

    logger.info("Connecting to the database...")
    try:
        conn = await asyncpg.connect(database_url)
        logger.info("Successfully connected to the database.")
    except Exception:
        logger.exception("Failed to connect to the migration database.")
        raise

    files_to_run = ["db/new_seed.sql"] if seed_only else [
        "db/schema.sql",
        "db/new_seed.sql",
    ]

    if seed_only:
        logger.info("Seed-only mode enabled; schema file will be skipped.")

    try:
        async with conn.transaction():
            for file_path in files_to_run:
                label = file_path
                sql = expand_psql_file(file_path)

                if not sql.strip():
                    logger.warning("Skipping empty SQL file: %s", label)
                    continue

                logger.info("Executing %s...", label)
                await conn.execute(sql)
                logger.info("  ✓ %s", label)
    except Exception:
        logger.exception("Migration failed; all changes in this run were rolled back.")
        raise
    finally:
        await conn.close()

    logger.info("Migration complete!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Apply the MedSync schema and the single viva seed to an empty demo database."
    )
    parser.add_argument(
        "--seed-only", action="store_true",
        help="Skip schema creation; existing schema must have empty data tables.",
    )
    args = parser.parse_args()
    asyncio.run(migrate(seed_only=args.seed_only))
