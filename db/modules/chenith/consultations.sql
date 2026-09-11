CREATE TABLE consultations (
    consultation_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    appointment_id     INT NOT NULL UNIQUE REFERENCES appointments(appointment_id),
    diagnosis          VARCHAR(255),
    consultation_notes TEXT NOT NULL,
    created_date       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consultations_appointment ON consultations(appointment_id);