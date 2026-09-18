-- db/seed/04_billing_insurance_seed.sql
-- Module: Billing & Insurance Seed Data
-- Author: Shavinda

-- Seed Insurance Providers & Policy Details
INSERT INTO insurance_policy_details (provider_name, policy_name) VALUES
    ('Ceylinco Life', 'Gold Health Shield'),
    ('Softlogic Life', 'Executive Healthcare'),
    ('AIA Insurance', 'Comprehensive Care Plus')
ON CONFLICT DO NOTHING;

-- Resolve policy and treatment IDs by stable names rather than identity values.
INSERT INTO policy_treatment_coverage (policy_id, treatment_code, coverage_percentage)
SELECT p.policy_id, t.treatment_code, coverage.coverage_percentage
FROM (VALUES
    ('Ceylinco Life', 'Gold Health Shield', 'General Consultation', 80.00::DECIMAL),
    ('Ceylinco Life', 'Gold Health Shield', 'Blood Glucose Test', 75.00::DECIMAL),
    ('Softlogic Life', 'Executive Healthcare', 'General Consultation', 100.00::DECIMAL),
    ('Softlogic Life', 'Executive Healthcare', 'Blood Glucose Test', 90.00::DECIMAL),
    ('Softlogic Life', 'Executive Healthcare', 'Chest X-Ray', 85.00::DECIMAL),
    ('AIA Insurance', 'Comprehensive Care Plus', 'General Consultation', 70.00::DECIMAL),
    ('AIA Insurance', 'Comprehensive Care Plus', 'Chest X-Ray', 60.00::DECIMAL)
) AS coverage(provider_name, policy_name, treatment_name, coverage_percentage)
JOIN insurance_policy_details p
  ON p.provider_name = coverage.provider_name
 AND p.policy_name = coverage.policy_name
JOIN treatment_catalogue t ON t.treatment_name = coverage.treatment_name
ON CONFLICT (policy_id, treatment_code) DO NOTHING;
