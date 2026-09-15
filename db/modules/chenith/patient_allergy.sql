CREATE TABLE patient_allergy (
    patient_id INT NOT NULL REFERENCES patient(user_id) ON DELETE CASCADE,
    allergy_id INT NOT NULL REFERENCES allergy(allergy_id) ON DELETE RESTRICT,
    PRIMARY KEY (patient_id, allergy_id)
);

CREATE INDEX idx_patient_allergy_allergy ON patient_allergy(allergy_id);