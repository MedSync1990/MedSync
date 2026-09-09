-- MedSync CATMS - Patient Management and Consultation/Treatment module
-- Depends on: role, app_user, branch, appointments, and the shared enum types.

CREATE TABLE patient (
    user_id           INT PRIMARY KEY REFERENCES app_user(user_id) ON DELETE RESTRICT,
    patient_code      VARCHAR(9) GENERATED ALWAYS AS
                      ('PT-' || lpad(user_id::text, 6, '0')) STORED,
    blood_group       VARCHAR(5),
    emergency_contact VARCHAR(10)
                      CHECK (emergency_contact IS NULL OR emergency_contact ~ '^[0-9]{10}$'),
    contact_name      VARCHAR(100),
    registered_branch INT REFERENCES branch(branch_id),
    registered_date   DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE UNIQUE INDEX uq_patient_code ON patient(patient_code);
CREATE INDEX idx_patient_registered_branch ON patient(registered_branch);

CREATE TABLE allergy (
    allergy_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    allergy_code VARCHAR(20) NOT NULL UNIQUE,
    name         VARCHAR(100) NOT NULL
);

CREATE TABLE patient_allergy (
    patient_id INT NOT NULL REFERENCES patient(user_id) ON DELETE CASCADE,
    allergy_id INT NOT NULL REFERENCES allergy(allergy_id) ON DELETE RESTRICT,
    PRIMARY KEY (patient_id, allergy_id)
);

CREATE INDEX idx_patient_allergy_allergy ON patient_allergy(allergy_id);

CREATE TABLE admission (
    admission_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_id     INT NOT NULL REFERENCES patient(user_id) ON DELETE CASCADE,
    admit_date     DATE NOT NULL,
    discharge_date DATE CHECK (discharge_date IS NULL OR discharge_date >= admit_date),
    reason         VARCHAR(255),
    status         admission_status_enum NOT NULL DEFAULT 'Admitted'
);

CREATE INDEX idx_admission_patient ON admission(patient_id);

CREATE TABLE treatment_catalogue (
    treatment_code            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    treatment_name            VARCHAR(100) NOT NULL,
    category                  VARCHAR(50) NOT NULL,
    price                     DECIMAL(10,2) NOT NULL CHECK (price > 0),
    is_eligible_for_insurance BOOLEAN NOT NULL DEFAULT FALSE,
    is_active                 BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_treatment_category ON treatment_catalogue(category);
CREATE INDEX idx_treatment_active ON treatment_catalogue(is_active);

CREATE TABLE consultations (
    consultation_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    appointment_id    INT NOT NULL UNIQUE REFERENCES appointments(appointment_id),
    diagnosis         VARCHAR(255),
    consultation_notes TEXT NOT NULL,
    created_date      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consultations_appointment ON consultations(appointment_id);

CREATE TABLE consultation_treatments (
    consultation_id INT NOT NULL REFERENCES consultations(consultation_id) ON DELETE CASCADE,
    treatment_code  INT NOT NULL REFERENCES treatment_catalogue(treatment_code),
    quantity        INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    unit_price      DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
    PRIMARY KEY (consultation_id, treatment_code)
);

CREATE INDEX idx_consultation_treatments_code ON consultation_treatments(treatment_code);

-- FR-CTM-06: clinical records may only be inserted after the appointment is completed.
CREATE OR REPLACE FUNCTION fn_guard_consultation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_status appointment_status_enum;
BEGIN
    SELECT status
    INTO v_status
    FROM appointments
    WHERE appointment_id = NEW.appointment_id;

    IF v_status IS DISTINCT FROM 'Completed' THEN
        RAISE EXCEPTION 'consultation notes may only be recorded once the appointment is Completed'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_guard_consultation_treatments()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_status appointment_status_enum;
BEGIN
    SELECT a.status
    INTO v_status
    FROM consultations c
    JOIN appointments a ON a.appointment_id = c.appointment_id
    WHERE c.consultation_id = NEW.consultation_id;

    IF v_status IS DISTINCT FROM 'Completed' THEN
        RAISE EXCEPTION 'treatments may only be recorded once the appointment is Completed'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_consultation
    BEFORE INSERT ON consultations
    FOR EACH ROW EXECUTE FUNCTION fn_guard_consultation();

CREATE TRIGGER trg_guard_consultation_treatments
    BEFORE INSERT ON consultation_treatments
    FOR EACH ROW EXECUTE FUNCTION fn_guard_consultation_treatments();

-- FR-TCM-05: catalogue entries remain available for historical treatment rows.
CREATE OR REPLACE FUNCTION fn_deactivate_treatment(p_treatment_code INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE treatment_catalogue
    SET is_active = FALSE
    WHERE treatment_code = p_treatment_code;
END;
$$;