-- =======================================================================================
-- Table: specialty
-- Role: Independent lookup table containing medical disciplines (e.g., Cardiology, ENT).
-- Owner: Kalana Jayawardena
-- =======================================================================================

CREATE TABLE IF NOT EXISTS specialty (
    specialty_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           VARCHAR(100) NOT NULL UNIQUE,
    description    VARCHAR(500)
);

-- redundant. Automatically created with the unique keyword.
-- CREATE INDEX IF NOT EXISTS idx_specialty_name ON specialty(name);
