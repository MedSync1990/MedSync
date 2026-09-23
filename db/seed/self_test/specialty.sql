INSERT INTO specialty (name, description) VALUES
    ('Self-Test General Medicine', 'General medicine specialty for self-testing'),
    ('Self-Test Cardiology', 'Cardiology specialty for self-testing'),
    ('Self-Test Pediatrics', 'Pediatrics specialty for self-testing'),
    ('Self-Test Dermatology', 'Dermatology specialty for self-testing')
ON CONFLICT (name) DO NOTHING;
