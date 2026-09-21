INSERT INTO consultation_treatments (consultation_id, treatment_code, quantity, unit_price)
SELECT c.consultation_id, t.treatment_code, v.quantity, t.price
FROM consultations c
JOIN appointments a ON a.appointment_id = c.appointment_id
JOIN app_user pu ON pu.user_id = a.patient_id
JOIN (VALUES
    ('test.patient1@medsync.test', 'Self-Test Consultation', 1),
    ('test.patient1@medsync.test', 'Self-Test Blood Test', 2),
    ('test.patient2@medsync.test', 'Self-Test Consultation', 1),
    ('test.patient2@medsync.test', 'Self-Test X-Ray', 1),
    ('test.patient3@medsync.test', 'Self-Test X-Ray', 1),
    ('test.patient3@medsync.test', 'Self-Test ECG', 1)
) AS v(email, treatment_name, quantity) ON v.email = pu.email
JOIN treatment_catalogue t ON t.treatment_name = v.treatment_name
ON CONFLICT (consultation_id, treatment_code) DO NOTHING;
