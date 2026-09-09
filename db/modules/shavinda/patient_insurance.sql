-- Links patients to their insurance policies with card details and validity range checks
CREATE TABLE IF NOT EXISTS patient_insurance (
    insurance_id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_id             INT NOT NULL REFERENCES patient(user_id) ON DELETE CASCADE,
    policy_id              INT NOT NULL REFERENCES insurance_policy_details(policy_id),
    insurance_card_number  VARCHAR(40) NOT NULL,
    start_date             DATE NOT NULL,
    end_date               DATE NOT NULL CHECK (end_date > start_date), 
    is_active               BOOLEAN NOT NULL DEFAULT TRUE                -
);

-- Index for fast patient policy lookup during invoice generation
CREATE INDEX IF NOT EXISTS idx_patient_insurance_patient ON patient_insurance(patient_id);
