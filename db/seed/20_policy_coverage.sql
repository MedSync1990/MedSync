INSERT INTO policy_treatment_coverage (policy_id, treatment_code, coverage_percentage)
SELECT p.policy_id, t.treatment_code,
       (50 + ((p.policy_id + t.treatment_code) % 6) * 10)::decimal(5,2)
FROM insurance_policy_details p
CROSS JOIN treatment_catalogue t
WHERE p.policy_name = 'MedShield Plan ' || lpad(t.treatment_code::text, 2, '0')
   OR (p.policy_name = 'MedShield Plan 01' AND t.treatment_name = 'General Consultation')
ON CONFLICT (policy_id, treatment_code) DO NOTHING;
