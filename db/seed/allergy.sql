INSERT INTO allergy (allergy_code, name) VALUES
    ('ALG-001', 'Penicillin'),
    ('ALG-002', 'Peanuts'),
    ('ALG-003', 'Latex'),
    ('ALG-004', 'Aspirin'),
    ('ALG-005', 'Dust mites')
ON CONFLICT (allergy_code) DO NOTHING;