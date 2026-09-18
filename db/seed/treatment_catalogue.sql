TRUNCATE treatment_catalogue CASCADE;

INSERT INTO treatment_catalogue
    (treatment_name, category, price, is_eligible_for_insurance)
VALUES
    ('General Consultation', 'Consultation', 2500.00, TRUE),
    ('Follow-up Consultation', 'Consultation', 1500.00, TRUE),
    ('Blood Pressure Check', 'Diagnostic', 500.00, FALSE),
    ('Blood Glucose Test', 'Diagnostic', 850.00, TRUE),
    ('Full Blood Count', 'Laboratory', 1800.00, TRUE),
    ('Urine Analysis', 'Laboratory', 1200.00, TRUE),
    ('Wound Dressing', 'Procedure', 1000.00, TRUE),
    ('Injection Administration', 'Procedure', 750.00, FALSE),
    ('Nebulisation', 'Procedure', 1800.00, TRUE),
    ('ECG', 'Diagnostic', 3500.00, TRUE),
    ('Ultrasound Scan', 'Diagnostic', 6500.00, TRUE),
    ('Physiotherapy Session', 'Therapy', 3000.00, TRUE),
    ('Dental Cleaning', 'Dental', 4000.00, FALSE),
    ('Dental Filling', 'Dental', 5500.00, FALSE),
    ('Minor Surgical Dressing', 'Procedure', 2500.00, TRUE),
    ('Health Screening Package', 'Preventive', 8000.00, TRUE),
    ('Medication Review', 'Consultation', 1200.00, TRUE),
    ('Nutritional Consultation', 'Consultation', 3000.00, TRUE),
    ('Chest X-Ray', 'Diagnostic', 4500.00, TRUE),
    ('Lipid Profile', 'Laboratory', 2400.00, TRUE);