-- db/seed/04_billing_insurance_seed.sql
-- Module: Billing & Insurance Seed Data
-- Author: Shavinda

-- Seed Insurance Providers & Policy Details
INSERT INTO insurance_policy_details (provider_name, policy_name) VALUES
    ('Ceylinco Life', 'Gold Health Shield'),
    ('Softlogic Life', 'Executive Healthcare'),
    ('AIA Insurance', 'Comprehensive Care Plus')
ON CONFLICT DO NOTHING;

-- Seed Policy Treatment Coverage Percentages
-- Note: Assuming treatment_code 1, 2, 3, 4 exist from Chenith's treatment catalogue seed.
-- Coverage maps policy_id + treatment_code to coverage percentage.
INSERT INTO policy_treatment_coverage (policy_id, treatment_code, coverage_percentage) VALUES
    (1, 1, 80.00), -- Ceylinco Gold: 80% coverage on General Consultation
    (1, 2, 75.00), -- Ceylinco Gold: 75% coverage on Blood Test
    (2, 1, 100.00),-- Softlogic Executive: 100% coverage on General Consultation
    (2, 2, 90.00), -- Softlogic Executive: 90% coverage on Blood Test
    (2, 3, 85.00), -- Softlogic Executive: 85% coverage on X-Ray Scan
    (3, 1, 70.00), -- AIA Comprehensive: 70% coverage on General Consultation
    (3, 3, 60.00)  -- AIA Comprehensive: 60% coverage on X-Ray Scan
ON CONFLICT DO NOTHING;
