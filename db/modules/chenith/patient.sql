CREATE TABLE patient (
    user_id           INT PRIMARY KEY REFERENCES app_user(user_id) ON DELETE RESTRICT,
    patient_code      VARCHAR(9) GENERATED ALWAYS AS
                      ('PT-' || lpad(user_id::text, 6, '0')) STORED,
    blood_group       VARCHAR(5),
    emergency_contact VARCHAR(10)
                      CHECK (emergency_contact IS NULL OR emergency_contact ~ '^[0-9]{10}$'),
    contact_name      VARCHAR(100),
    registered_branch INT REFERENCES branch(branch_id),
    registered_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX uq_patient_code ON patient(patient_code);
CREATE INDEX idx_patient_registered_branch ON patient(registered_branch);