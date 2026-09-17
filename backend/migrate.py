import asyncio
import asyncpg
import os
from dotenv import load_dotenv
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from the repository root regardless of the current directory.
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=ROOT_DIR / ".env")


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

    # Files in FK-safe execution order. Entry-point files use psql's \i syntax,
    # so the asyncpg runner lists their concrete files explicitly.
    files_to_run = [
        ("CREATE EXTENSION IF NOT EXISTS btree_gist; CREATE EXTENSION IF NOT EXISTS pg_trgm;", None),
        ("DO $$ BEGIN CREATE TYPE gender_enum AS ENUM ('Male', 'Female', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;", None),
        ("DO $$ BEGIN CREATE TYPE slot_status_enum AS ENUM ('Open', 'Booked', 'Blocked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;", None),
        ("DO $$ BEGIN CREATE TYPE appointment_type_enum AS ENUM ('Scheduled Visit', 'Walk-in', 'Follow-up'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;", None),
        ("DO $$ BEGIN CREATE TYPE appointment_status_enum AS ENUM ('Scheduled', 'Completed', 'Cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;", None),
        ("DO $$ BEGIN CREATE TYPE admission_status_enum AS ENUM ('Admitted', 'Discharged'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;", None),
        ("DO $$ BEGIN CREATE TYPE invoice_status_enum AS ENUM ('Unpaid', 'Partially Paid', 'Paid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;", None),
        ("DO $$ BEGIN CREATE TYPE payment_type_enum AS ENUM ('Cash', 'Card', 'Insurance Settlement'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;", None),
        (None, "db/modules/dilantha/01_role.sql"),
        (None, "db/modules/dilantha/02_branch.sql"),
        (None, "db/modules/dilantha/03_app_user.sql"),
        (None, "db/modules/dilantha/04_staff.sql"),
        (None, "db/modules/dilantha/05_protection_functions.sql"),
        (None, "db/modules/dilantha/06_auth_functions.sql"),
        (None, "db/modules/dilantha/07_pg_roles.sql"),
        (None, "db/modules/chenith/patient.sql"),
        (None, "db/modules/chenith/allergy.sql"),
        (None, "db/modules/chenith/patient_allergy.sql"),
        (None, "db/modules/chenith/admission.sql"),
        (None, "db/modules/chenith/treatment_catalogue.sql"),
        (None, "db/modules/kalana/specialty.sql"),
        (None, "db/modules/kalana/doctor.sql"),
        (None, "db/modules/kalana/doctor_speciality.sql"),
        (None, "db/modules/kalana/doctor_availability_slots.sql"),
        (None, "db/modules/kalana/appointments.sql"),
        (None, "db/modules/kalana/fn_book_appointment.sql"),
        (None, "db/modules/kalana/fn_create_walk_in.sql"),
        (None, "db/modules/kalana/fn_reschedule_appointment.sql"),
        (None, "db/modules/kalana/fn_cancel_appointment.sql"),
        (None, "db/modules/kalana/trg_block_delete_doctor.sql"),
        (None, "db/modules/chenith/consultations.sql"),
        (None, "db/modules/chenith/consultation_treatments.sql"),
        ("ALTER TABLE patient ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;", None),
        ("ALTER TABLE consultation_treatments ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2);", None),
        ("UPDATE consultation_treatments ct SET unit_price = tc.price FROM treatment_catalogue tc WHERE ct.treatment_code = tc.treatment_code AND ct.unit_price IS NULL;", None),
        ("ALTER TABLE consultation_treatments ALTER COLUMN unit_price SET NOT NULL;", None),
        (None, "db/modules/chenith/consultation_guards.sql"),
        (None, "db/modules/chenith/fn_complete_appointment.sql"),
        (None, "db/modules/chenith/fn_deactivate_treatment.sql"),
        (None, "db/modules/shavinda/insurance_policy_details.sql"),
        (None, "db/modules/shavinda/patient_insurance.sql"),
        (None, "db/modules/shavinda/policy_treatment_coverage.sql"),
        (None, "db/modules/shavinda/invoices.sql"),
        (None, "db/modules/shavinda/payments.sql"),
        (None, "db/modules/shavinda/fn_record_payment.sql"),
        (None, "db/modules/shavinda/fn_calculate_invoice_total.sql"),
        (None, "db/modules/shavinda/fn_is_policy_active.sql"),
        (None, "db/modules/shavinda/fn_calculate_insurance_coverage.sql"),
        (None, "db/modules/ashen/01_audit_log.sql"),
        (None, "db/modules/ashen/02_fn_audit_trigger.sql"),
        (None, "db/modules/ashen/03_rls_policies.sql"),
        (None, "db/modules/ashen/04_audit_triggers.sql"),
        (None, "db/modules/ashen/05_reporting_views.sql"),
        (None, "db/seed/01_branches_staff.sql"),
        (None, "db/seed/02_doctors_specialties_slots.sql"),
        (None, "db/seed/app_user.sql"),
        (None, "db/seed/patient.sql"),
        (None, "db/seed/contact.sql"),
        (None, "db/seed/allergy.sql"),
        (None, "db/seed/patient_allergy.sql"),
        (None, "db/seed/admission.sql"),
        (None, "db/seed/treatment_catalogue.sql"),
        (None, "db/seed/consultations.sql"),
        (None, "db/seed/consultation_treatments.sql"),
        (None, "db/seed/04_billing_insurance_seed.sql"),
    ]

    for item in files_to_run:
        inline_sql, file_path = item

        if inline_sql:
            label = "inline SQL"
            sql = inline_sql
        else:
            if not file_path:
                continue
            label = file_path
            try:
                with open(ROOT_DIR / file_path, "r", encoding="utf-8") as f:
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
            if getattr(e, "sqlstate", None) in {"42P07", "42710", "42723"}:
                logger.warning("  ⚠ Object already exists; continuing with the remaining migration.")
                continue
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
