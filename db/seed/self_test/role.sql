INSERT INTO role (role_name) VALUES
    ('Administrator'), ('Branch Manager'), ('Doctor'), ('Receptionist'), ('Patient')
ON CONFLICT (role_name) DO NOTHING;
