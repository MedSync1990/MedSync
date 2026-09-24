INSERT INTO specialty (name, description)
SELECT seed.name, seed.description
FROM (VALUES
    ('General Medicine', 'Primary care and adult medicine'),
    ('Cardiology', 'Heart and circulatory system care'),
    ('Pediatrics', 'Medical care for children'),
    ('Dermatology', 'Skin, hair, and nail conditions'),
    ('Orthopedics', 'Bones, joints, and musculoskeletal care'),
    ('Neurology', 'Brain, spine, and nervous system care'),
    ('Gynecology', 'Women''s reproductive health'),
    ('ENT', 'Ear, nose, and throat care'),
    ('Ophthalmology', 'Eye and vision care'),
    ('Radiology', 'Diagnostic medical imaging')
) AS seed(name, description)
WHERE NOT EXISTS (SELECT 1 FROM specialty existing WHERE existing.name = seed.name);
