INSERT INTO role (role_name)
SELECT role_name
FROM (VALUES
    ('Administrator'), ('Branch Manager'), ('Doctor'), ('Receptionist'), ('Patient')
) AS seed(role_name)
WHERE NOT EXISTS (
    SELECT 1 FROM role existing WHERE existing.role_name = seed.role_name
);
