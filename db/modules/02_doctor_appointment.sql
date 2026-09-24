-- ============================================================================
-- MedSync CATMS — Module 02: Doctor & Appointment Management
-- Owner: Kalana Jayawardena
-- Description: Entry point file that includes all tables, functions, and triggers
--              for Module 02 in FK-safe dependency order.
-- ============================================================================

-- 1. Global Extension for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Table DDLs
\ir kalana/specialty.sql
\ir kalana/doctor.sql
\ir kalana/doctor_specialty.sql
\ir kalana/doctor_availability_slots.sql
\ir kalana/appointments.sql

-- 3. Stored Functions & Triggers
\ir kalana/fn_book_appointment.sql
\ir kalana/fn_create_walk_in.sql
\ir kalana/fn_reschedule_appointment.sql
\ir kalana/fn_cancel_appointment.sql
\ir kalana/trg_block_delete_doctor.sql
