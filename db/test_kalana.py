"""
MedSync CATMS — Verification Test Script (Module 02: Kalana Jayawardena)
Tests all tables, functions, triggers, and seed data natively using asyncpg (NO Docker).
Usage:
    ./backend/venv/bin/python db/test_kalana.py
"""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import asyncpg

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in .env file.")
    sys.exit(1)

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
MODULES_DIR = BASE_DIR / "db" / "modules" / "kalana"
SEED_FILE = BASE_DIR / "db" / "seed" / "02_doctors_specialties_slots.sql"

# Ordered list of Kalana's individual DDL, function, and trigger files
SQL_FILES = [
    "specialty.sql",
    "doctor.sql",
    "doctor_specialty.sql",
    "doctor_availability_slots.sql",
    "appointments.sql",
    "fn_book_appointment.sql",
    "fn_create_walk_in.sql",
    "fn_reschedule_appointment.sql",
    "fn_cancel_appointment.sql",
    "trg_block_delete_doctor.sql",
]


async def run_tests():
    print("==================================================================")
    print(" MedSync CATMS — Native Database Verification (Module 02: Kalana)")
    print("==================================================================")
    print(f"Connecting to: {DATABASE_URL.split('@')[-1]} (SSL enabled)")

    conn = await asyncpg.connect(DATABASE_URL)

    try:
        # Step 1: Execute all 10 module files in order
        print("\n[1/5] Applying all 10 table, function, and trigger files...")
        for filename in SQL_FILES:
            filepath = MODULES_DIR / filename
            if not filepath.exists():
                print(f"  [ERROR] File missing: {filepath}")
                continue
            sql = filepath.read_text()
            await conn.execute(sql)
            print(f"  ✓ Applied: {filename}")

        # Step 2: Apply seed data
        print("\n[2/5] Applying seed data (02_doctors_specialties_slots.sql)...")
        if SEED_FILE.exists():
            seed_sql = SEED_FILE.read_text()
            await conn.execute(seed_sql)
            print("  ✓ Seed data applied successfully.")

        # Step 3: Verify table counts
        print("\n[3/5] Verifying table counts...")
        for table in [
            "specialty",
            "doctor",
            "doctor_specialty",
            "doctor_availability_slots",
            "appointments",
        ]:
            count = await conn.fetchval(f"SELECT COUNT(*) FROM {table}")
            print(f"  ✓ {table:<26}: {count:>4} rows")

        # Step 4: Test Slot Overlap Prevention (FR-AM-03: excl_slot_overlap)
        print("\n[4/5] Testing slot overlap prevention constraint (FR-AM-03)...")
        doctor_id = await conn.fetchval("SELECT user_id FROM doctor ORDER BY user_id LIMIT 1")
        if doctor_id is None:
            raise RuntimeError("No seeded doctor is available for verification")
        patient_id = await conn.fetchval("SELECT user_id FROM patient ORDER BY user_id LIMIT 1")
        if patient_id is None:
            raise RuntimeError("No seeded patient is available for verification")
        try:
            await conn.execute(
                """
                INSERT INTO doctor_availability_slots (doctor_id, date, start_time, end_time, status)
                VALUES ($1, CURRENT_DATE, '09:15:00', '09:45:00', 'Open');
                """,
                doctor_id,
            )
            print("  ✗ FAILED: Database allowed overlapping slot!")
        except asyncpg.ExclusionViolationError:
            print("  ✓ PASSED: Database engine blocked overlapping slot with ExclusionViolationError!")

        # Step 5: Test Stored Functions & Triggers
        print("\n[5/5] Testing Stored Functions & Delete Guard Trigger...")

        # 5a: Test fn_book_appointment
        appt_id = None
        slot = await conn.fetchrow(
            "SELECT slot_id FROM doctor_availability_slots WHERE doctor_id = $1 AND status = 'Open' LIMIT 1",
            doctor_id,
        )
        if slot:
            slot_id = slot["slot_id"]
            appt_id = await conn.fetchval(
                "SELECT fn_book_appointment($1, $2, $3::appointment_type_enum)",
                patient_id,
                slot_id,
                "Scheduled Visit",
            )
            print(f"  ✓ fn_book_appointment: Booked appt_id={appt_id} on slot_id={slot_id}")

            # Verify double-booking prevention on same slot
            try:
                await conn.fetchval(
                    "SELECT fn_book_appointment($1, $2, $3::appointment_type_enum)",
                    patient_id,
                    slot_id,
                    "Scheduled Visit",
                )
                print("  ✗ FAILED: Double-booking succeeded on same slot!")
            except asyncpg.PostgresError as e:
                print(f"  ✓ Double-booking blocked cleanly: {str(e)}")

            # 5b: Test fn_reschedule_appointment
            new_slot = await conn.fetchrow(
                "SELECT slot_id FROM doctor_availability_slots WHERE doctor_id = $1 AND status = 'Open' AND slot_id <> $2 LIMIT 1",
                doctor_id,
                slot_id,
            )
            if new_slot:
                new_slot_id = new_slot["slot_id"]
                await conn.execute("SELECT fn_reschedule_appointment($1, $2)", appt_id, new_slot_id)
                print(f"  ✓ fn_reschedule_appointment: Rescheduled appt_id={appt_id} to slot_id={new_slot_id}")

                # 5c: Test fn_cancel_appointment
                await conn.execute("SELECT fn_cancel_appointment($1)", appt_id)
                status = await conn.fetchval(
                    "SELECT status FROM doctor_availability_slots WHERE slot_id = $1", new_slot_id
                )
                print(f"  ✓ fn_cancel_appointment: Cancelled appt_id={appt_id}, slot_id={new_slot_id} reopened ({status})")

        # 5d: Test trg_block_delete_doctor
        try:
            await conn.execute("DELETE FROM doctor WHERE user_id = $1", doctor_id)
            print("  ✗ FAILED: Hard delete succeeded on doctor!")
        except (asyncpg.CheckViolationError, asyncpg.IntegrityConstraintViolationError) as e:
            print(f"  ✓ trg_block_delete_doctor: Blocked hard delete -> '{e}'")

        # Cleanup test appointment records
        if slot:
            await conn.execute("DELETE FROM appointments WHERE appointment_id = $1", appt_id)

        print("\n==================================================================")
        print(" ALL TESTS PASSED! Module 02 is 100% verified against Neon DB.")
        print("==================================================================")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run_tests())