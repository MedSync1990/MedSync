INSERT INTO appointments (patient_id, slot_id, appointment_type, status)
SELECT p.user_id, slots.slot_id, 'Scheduled Visit'::appointment_type_enum,
       'Completed'::appointment_status_enum
FROM (
    SELECT u.user_id, row_number() OVER (ORDER BY u.email) AS sequence
    FROM app_user u
    JOIN patient p ON p.user_id = u.user_id
    WHERE u.email LIKE 'patient%@medsync.test'
) patients
JOIN patient p ON p.user_id = patients.user_id
JOIN (
    SELECT das.slot_id, row_number() OVER (ORDER BY du.email) AS sequence
    FROM doctor_availability_slots das
    JOIN doctor d ON d.user_id = das.doctor_id
    JOIN app_user du ON du.user_id = d.user_id
    WHERE das.date = CURRENT_DATE + 1
) slots ON slots.sequence = patients.sequence
WHERE NOT EXISTS (
    SELECT 1 FROM appointments existing WHERE existing.slot_id = slots.slot_id
);
