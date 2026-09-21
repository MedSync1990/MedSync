INSERT INTO insurance_policy_details (provider_name, policy_name)
SELECT v.provider_name, v.policy_name
FROM (VALUES
    ('Self-Test Insurance', 'Self-Test Gold Plan'),
    ('Self-Test Insurance', 'Self-Test Basic Plan'),
    ('Self-Test Insurance', 'Self-Test Silver Plan')
) AS v(provider_name, policy_name)
WHERE NOT EXISTS (
    SELECT 1 FROM insurance_policy_details p
    WHERE p.provider_name = v.provider_name AND p.policy_name = v.policy_name
);
