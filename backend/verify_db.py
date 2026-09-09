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

    logger.info("=" * 60)
    logger.info("MedSync DB Verification — Module 01 (Auth & Branch/Staff)")
    logger.info("=" * 60)

    # ── 1. Check tables exist ─────────────────────────────────────────────
    tables = await conn.fetch("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """)
    logger.info(f"\nTables found: {[t['table_name'] for t in tables]}")

    # ── 2. Check row counts ───────────────────────────────────────────────
    expected_tables = ['role', 'branch', 'app_user', 'contact', 'staff']
    logger.info("\nRow counts:")
    for table_name in expected_tables:
        try:
            count = await conn.fetchval(f'SELECT COUNT(*) FROM {table_name}')
            logger.info(f"  {table_name}: {count} rows")
        except Exception as e:
            logger.warning(f"  {table_name}: ERROR — {e}")

    # ── 3. Check columns for each table ───────────────────────────────────
    logger.info("\nTable columns:")
    for table_name in expected_tables:
        cols = await conn.fetch("""
            SELECT column_name, data_type FROM information_schema.columns
            WHERE table_name = $1 AND table_schema = 'public'
            ORDER BY ordinal_position;
        """, table_name)
        if cols:
            logger.info(f"  {table_name}: {[(c['column_name'], c['data_type']) for c in cols]}")
        else:
            logger.warning(f"  {table_name}: no columns found (table may not exist)")

    # ── 4. Verify password hashing ────────────────────────────────────────
    logger.info("\nPassword hash check:")
    sample = await conn.fetchval('SELECT password_hash FROM staff LIMIT 1')
    if sample and sample.startswith('$2'):
        logger.info("  ✓ Passwords are bcrypt-hashed correctly")
    elif sample:
        logger.warning(f"  ✗ Password may not be hashed: {sample[:20]}...")
    else:
        logger.warning("  ✗ No staff rows found to check")

    # ── 5. Verify roles are seeded correctly ──────────────────────────────
    logger.info("\nRole check:")
    roles = await conn.fetch("SELECT role_name FROM role ORDER BY role_id")
    role_names = [r['role_name'] for r in roles]
    expected_roles = ['Administrator', 'Branch Manager', 'Doctor', 'Receptionist', 'Patient']
    if role_names == expected_roles:
        logger.info(f"  ✓ All 5 roles present: {role_names}")
    else:
        logger.warning(f"  ✗ Expected {expected_roles}, got {role_names}")

    # ── 6. Verify branches are seeded correctly ───────────────────────────
    logger.info("\nBranch check:")
    branches = await conn.fetch("SELECT name, is_active FROM branch ORDER BY branch_id")
    for b in branches:
        logger.info(f"  {b['name']}: is_active={b['is_active']}")

    # ── 7. Verify constraints ─────────────────────────────────────────────
    logger.info("\nConstraint checks:")
    constraints = await conn.fetch("""
        SELECT conname, contype, conrelid::regclass AS table_name
        FROM pg_constraint
        WHERE connamespace = 'public'::regnamespace
          AND conrelid::regclass::text IN ('role', 'branch', 'app_user', 'contact', 'staff')
        ORDER BY conrelid::regclass, conname;
    """)
    for c in constraints:
        ctype = {'p': 'PRIMARY KEY', 'f': 'FOREIGN KEY', 'u': 'UNIQUE', 'c': 'CHECK'}.get(c['contype'], c['contype'])
        logger.info(f"  {c['table_name']}.{c['conname']} ({ctype})")

    # ── 8. Verify triggers ────────────────────────────────────────────────
    logger.info("\nTrigger checks:")
    triggers = await conn.fetch("""
        SELECT tgname, tgrelid::regclass AS table_name
        FROM pg_trigger
        WHERE tgrelid::regclass::text IN ('branch', 'staff')
          AND NOT tgisinternal
        ORDER BY tgrelid::regclass, tgname;
    """)
    for t in triggers:
        logger.info(f"  {t['table_name']}: {t['tgname']}")

    # ── 9. Verify functions ───────────────────────────────────────────────
    logger.info("\nFunction checks:")
    functions = await conn.fetch("""
        SELECT proname FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
          AND proname IN ('fn_deactivate_branch', 'fn_deactivate_staff',
                          'fn_block_hard_delete', 'fn_register_login_attempt')
        ORDER BY proname;
    """)
    fn_names = [f['proname'] for f in functions]
    logger.info(f"  Found: {fn_names}")
    expected_fns = ['fn_block_hard_delete', 'fn_deactivate_branch', 'fn_deactivate_staff', 'fn_register_login_attempt']
    missing = [f for f in expected_fns if f not in fn_names]
    if missing:
        logger.warning(f"  ✗ Missing functions: {missing}")
    else:
        logger.info("  ✓ All expected functions present")

    await conn.close()
    logger.info("\n" + "=" * 60)
    logger.info("Verification complete!")
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(verify())
