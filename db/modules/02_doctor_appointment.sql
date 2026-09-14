-- ============================================================================
-- MedSync CATMS — Module 02: Doctor & Appointment Management
-- Owner: Kalana Jayawardena
-- Description: Entry point file that includes all tables, functions, and triggers
--              for Module 02 in FK-safe dependency order.
-- Reference: docs/database.md §2.1, §2.2, §2.6, §7.1-§7.4, §7.10
-- ============================================================================

-- 1. Global Extension for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Table DDLs
\ir kalana/specialty.sql
\ir kalana/doctor.sql
\ir kalana/doctor_speciality.sql
\ir kalana/doctor_availability_slots.sql
\ir kalana/05_appointments.sql

-- 3. Stored Functions & Triggers
\ir kalana/06_fn_book_appointment.sql
\ir kalana/07_fn_create_walk_in.sql
\ir kalana/08_fn_reschedule_appointment.sql
\ir kalana/09_fn_cancel_appointment.sql
\ir kalana/10_trg_block_delete_doctor.sql
