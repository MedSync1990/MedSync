INSERT INTO branch (name, address, phone_number)
SELECT v.name, v.address, v.phone_number
FROM (VALUES
    ('Self-Test Colombo', '100 Test Avenue, Colombo 03', '0111111111'),
    ('Self-Test Kandy', '200 Test Street, Kandy', '0811111111'),
    ('Self-Test Galle', '300 Test Road, Galle', '0911111111'),
    ('Self-Test Jaffna', '400 Test Lane, Jaffna', '0211111111'),
    ('Self-Test Negombo', '500 Test Boulevard, Negombo', '0311111111')
) AS v(name, address, phone_number)
WHERE NOT EXISTS (
    SELECT 1 FROM branch b WHERE b.name = v.name
);
