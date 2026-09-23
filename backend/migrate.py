import asyncio
import asyncpg
import os
import sys
from dotenv import load_dotenv
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load the backend environment regardless of the current working directory.
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=ROOT_DIR / "backend" / ".env")


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
        (None, "db/seed/01_roles.sql"),
        (None, "db/seed/02_branches.sql"),
        (None, "db/seed/03_users.sql"),
        (None, "db/seed/04_contacts.sql"),
        (None, "db/seed/05_staff.sql"),
        (None, "db/seed/06_specialties.sql"),
        (None, "db/seed/07_doctors.sql"),
        (None, "db/seed/08_doctor_specialities.sql"),
        (None, "db/seed/09_patients.sql"),
        (None, "db/seed/10_allergies.sql"),
        (None, "db/seed/11_patient_allergies.sql"),
        (None, "db/seed/12_admissions.sql"),
        (None, "db/seed/13_treatments.sql"),
        (None, "db/seed/14_slots.sql"),
        (None, "db/seed/15_appointments.sql"),
        (None, "db/seed/16_consultations.sql"),
        (None, "db/seed/17_consultation_treatments.sql"),
        (None, "db/seed/18_insurance_policies.sql"),
        (None, "db/seed/19_patient_insurance.sql"),
        (None, "db/seed/20_policy_coverage.sql"),
        (None, "db/seed/21_invoices.sql"),
        (None, "db/seed/22_payments.sql"),
        (None, "db/seed/23_audit_log.sql"),
    ]

    if "--seed-only" in sys.argv:
        seed_files = [
            "01_roles.sql",
            "02_branches.sql",
            "03_users.sql",
            "04_contacts.sql",
            "05_staff.sql",
            "06_specialties.sql",
            "07_doctors.sql",
            "08_doctor_specialities.sql",
            "09_patients.sql",
            "10_allergies.sql",
            "11_patient_allergies.sql",
            "12_admissions.sql",
            "13_treatments.sql",
            "14_slots.sql",
            "15_appointments.sql",
            "16_consultations.sql",
            "17_consultation_treatments.sql",
            "18_insurance_policies.sql",
            "19_patient_insurance.sql",
            "20_policy_coverage.sql",
            "21_invoices.sql",
            "22_payments.sql",
            "23_audit_log.sql",
        ]
        files_to_run = [(None, f"db/seed/{file_name}") for file_name in seed_files]
        logger.info("Seed-only mode enabled; schema files will be skipped.")

    try:
        async with conn.transaction():
            for inline_sql, file_path in files_to_run:
                if inline_sql:
                    label = "inline SQL"
                    sql = inline_sql
                else:
                    if not file_path:
                        continue
                    label = file_path
                    try:
                        sql = (ROOT_DIR / file_path).read_text(encoding="utf-8")
                    except FileNotFoundError:
                        raise RuntimeError(f"SQL file not found: {file_path}") from None

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
    asyncio.run(migrate())
