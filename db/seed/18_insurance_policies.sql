INSERT INTO insurance_policy_details (provider_name, policy_name)
SELECT 'MedShield Provider ' || n,
       'MedShield Plan ' || lpad(n::text, 2, '0')
FROM generate_series(1, 10) AS n
WHERE NOT EXISTS (
    SELECT 1 FROM insurance_policy_details existing
    WHERE existing.provider_name = 'MedShield Provider ' || n
      AND existing.policy_name = 'MedShield Plan ' || lpad(n::text, 2, '0')
);
