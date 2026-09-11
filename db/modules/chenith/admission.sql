CREATE TABLE admission (
    admission_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_id     INT NOT NULL REFERENCES patient(user_id) ON DELETE CASCADE,
    admit_date     DATE NOT NULL,
    discharge_date DATE CHECK (discharge_date IS NULL OR discharge_date >= admit_date),
    reason         VARCHAR(255),
    status         admission_status_enum NOT NULL DEFAULT 'Admitted'
);

CREATE INDEX idx_admission_patient ON admission(patient_id);