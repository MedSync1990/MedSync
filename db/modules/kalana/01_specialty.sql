-- ============================================================================
-- Table: specialty
-- Module: 02 - Doctor & Appointment Management
-- Owner: Kalana Jayawardena
-- Reference: docs/database.md §2.1
-- ============================================================================

CREATE TABLE IF NOT EXISTS specialty (
    speciality_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           VARCHAR(80) NOT NULL UNIQUE,
    description    VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_specialty_name ON specialty(name);
