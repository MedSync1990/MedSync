INSERT INTO consultations (appointment_id, diagnosis, consultation_notes)
SELECT a.appointment_id, v.diagnosis, v.notes
FROM (VALUES
    ('test.patient1@medsync.test', 'Self-test hypertension review', 'Completed self-test consultation for hypertension screening.'),
    ('test.patient2@medsync.test', 'Self-test follow-up', 'Completed self-test follow-up consultation.'),
    ('test.patient3@medsync.test', 'Self-test imaging review', 'Completed self-test imaging review consultation.')
) AS v(email, diagnosis, notes)
JOIN app_user pu ON pu.email = v.email
JOIN appointments a ON a.patient_id = pu.user_id AND a.status = 'Completed'::appointment_status_enum
WHERE NOT EXISTS (
    SELECT 1 FROM consultations c WHERE c.appointment_id = a.appointment_id
);
