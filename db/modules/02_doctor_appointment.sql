-- ============================================================================
-- MedSync CATMS — Module 02: Doctor & Appointment Management
-- Owner: Kalana Jayawardena
-- Description: Module entry point that imports all table DDL scripts in FK order.
-- ============================================================================

-- Ensure required extension for double-booking exclusion constraint exists
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Specialty catalogue
\ir kalana/01_specialty.sql

-- 2. Doctor profile
\ir kalana/02_doctor.sql

-- 3. Doctor specialty junction
\ir kalana/03_doctor_specialty.sql

-- 4. Doctor availability slots
\ir kalana/04_doctor_availability_slots.sql

-- 5. Appointments & overlap prevention
\ir kalana/05_appointments.sql
