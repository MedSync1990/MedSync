INSERT INTO branch (name, address, phone_number)
SELECT seed.name, seed.address, seed.phone_number
FROM (VALUES
    ('Colombo Central', '100 Galle Road, Colombo 03', '0112345601'),
    ('Kandy City', '25 Peradeniya Road, Kandy', '0812345602'),
    ('Galle Fort', '12 Church Street, Galle', '0912345603'),
    ('Jaffna Town', '8 Hospital Road, Jaffna', '0212345604'),
    ('Negombo Beach', '44 Lewis Place, Negombo', '0312345605'),
    ('Matara South', '18 Akuressa Road, Matara', '0412345606'),
    ('Kurunegala North', '7 Colombo Road, Kurunegala', '0372345607'),
    ('Anuradhapura', '16 New Town, Anuradhapura', '0252345608'),
    ('Ratnapura', '9 Main Street, Ratnapura', '0452345609'),
    ('Batticaloa East', '31 Main Road, Batticaloa', '0652345610')
) AS seed(name, address, phone_number)
WHERE NOT EXISTS (
    SELECT 1 FROM branch existing WHERE existing.name = seed.name
);
