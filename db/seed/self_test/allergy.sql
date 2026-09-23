INSERT INTO allergy (allergy_code, name) VALUES
    ('SELF-ALL-001', 'Penicillin'),
    ('SELF-ALL-002', 'Peanuts'),
    ('SELF-ALL-003', 'Latex'),
    ('SELF-ALL-004', 'Dust'),
    ('SELF-ALL-005', 'Shellfish')
ON CONFLICT (allergy_code) DO NOTHING;
