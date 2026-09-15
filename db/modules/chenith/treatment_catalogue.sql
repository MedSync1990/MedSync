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