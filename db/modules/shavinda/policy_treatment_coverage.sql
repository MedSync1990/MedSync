
-- Maps insurance policies to specific treatment codes and defines their coverage percentages
CREATE TABLE IF NOT EXISTS policy_treatment_coverage (
    policy_id            INT NOT NULL REFERENCES insurance_policy_details(policy_id) ON DELETE CASCADE,
    treatment_code       INT NOT NULL REFERENCES treatment_catalogue(treatment_code) ON DELETE CASCADE,
    coverage_percentage  DECIMAL(5,2) NOT NULL CHECK (coverage_percentage BETWEEN 0 AND 100), 
    PRIMARY KEY (policy_id, treatment_code)
);
