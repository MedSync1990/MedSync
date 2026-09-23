INSERT INTO policy_treatment_coverage (policy_id, treatment_code, coverage_percentage)
SELECT p.policy_id, t.treatment_code, v.coverage_percentage
FROM (VALUES
    ('Self-Test Gold Plan', 'Self-Test Consultation', 80.00::decimal),
    ('Self-Test Gold Plan', 'Self-Test Blood Test', 75.00::decimal),
    ('Self-Test Gold Plan', 'Self-Test X-Ray', 70.00::decimal),
    ('Self-Test Basic Plan', 'Self-Test Consultation', 50.00::decimal),
    ('Self-Test Basic Plan', 'Self-Test X-Ray', 40.00::decimal),
    ('Self-Test Silver Plan', 'Self-Test X-Ray', 60.00::decimal),
    ('Self-Test Silver Plan', 'Self-Test ECG', 65.00::decimal)
) AS v(policy_name, treatment_name, coverage_percentage)
JOIN insurance_policy_details p
  ON p.provider_name = 'Self-Test Insurance'
 AND p.policy_name = v.policy_name
JOIN treatment_catalogue t ON t.treatment_name = v.treatment_name
ON CONFLICT (policy_id, treatment_code) DO NOTHING;
