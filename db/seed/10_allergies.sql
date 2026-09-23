INSERT INTO allergy (allergy_code, name)
SELECT seed.allergy_code, seed.name
FROM (VALUES
    ('ALG-001', 'Penicillin'), ('ALG-002', 'Aspirin'), ('ALG-003', 'Peanuts'),
    ('ALG-004', 'Shellfish'), ('ALG-005', 'Latex'), ('ALG-006', 'Dust Mites'),
    ('ALG-007', 'Pollen'), ('ALG-008', 'Dairy'), ('ALG-009', 'Eggs'), ('ALG-010', 'Soy')
) AS seed(allergy_code, name)
WHERE NOT EXISTS (SELECT 1 FROM allergy existing WHERE existing.allergy_code = seed.allergy_code);
