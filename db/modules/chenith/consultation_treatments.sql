CREATE TABLE consultation_treatments (
    consultation_id INT NOT NULL REFERENCES consultations(consultation_id) ON DELETE CASCADE,
    treatment_code  INT NOT NULL REFERENCES treatment_catalogue(treatment_code),
    quantity        INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    unit_price      DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
    PRIMARY KEY (consultation_id, treatment_code)
);

CREATE INDEX idx_consultation_treatments_code ON consultation_treatments(treatment_code);