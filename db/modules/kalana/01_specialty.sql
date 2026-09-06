-- ============================================================================
-- Table: SPECIALTY (or SPECIALITY per ERD)
-- Module: Doctor/Specialty & Appointment Management
-- Owner: Kalana Jayawardena
-- Description: Medical specialties catalogue (e.g., Cardiology, Dermatology)
-- ============================================================================

CREATE TABLE IF NOT EXISTS specialty (
    speciality_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for specialty name lookups
CREATE INDEX IF NOT EXISTS idx_specialty_name ON specialty(name);
