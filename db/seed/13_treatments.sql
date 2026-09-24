INSERT INTO treatment_catalogue (treatment_name, category, price, is_eligible_for_insurance)
SELECT seed.treatment_name, seed.category, seed.price, seed.is_eligible_for_insurance
FROM (VALUES
    ('General Consultation', 'Consultation', 2500.00, TRUE),
    ('Blood Test', 'Laboratory', 1500.00, TRUE),
    ('Urine Test', 'Laboratory', 900.00, TRUE),
    ('Chest X-Ray', 'Imaging', 3500.00, TRUE),
    ('ECG', 'Cardiology', 2800.00, TRUE),
    ('Ultrasound', 'Imaging', 5000.00, TRUE),
    ('Physiotherapy Session', 'Therapy', 3000.00, FALSE),
    ('Minor Wound Dressing', 'Procedure', 1200.00, FALSE),
    ('Vaccination', 'Preventive', 1800.00, FALSE),
    ('Health Screening', 'Screening', 7500.00, TRUE)
) AS seed(treatment_name, category, price, is_eligible_for_insurance)
WHERE NOT EXISTS (
    SELECT 1 FROM treatment_catalogue existing
    WHERE existing.treatment_name = seed.treatment_name
);
