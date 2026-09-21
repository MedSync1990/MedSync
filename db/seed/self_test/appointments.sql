INSERT INTO appointments (patient_id, slot_id, appointment_type, status)
SELECT p.user_id, s.slot_id, v.appointment_type::appointment_type_enum,
       v.appointment_status::appointment_status_enum
FROM (VALUES
    ('test.patient1@medsync.test', 0, '09:00', 'Scheduled Visit', 'Completed'),
    ('test.patient2@medsync.test', 0, '10:00', 'Follow-up', 'Completed'),
    ('test.patient1@medsync.test', 1, '09:00', 'Walk-in', 'Cancelled'),
    ('test.patient3@medsync.test', 0, '09:00', 'Scheduled Visit', 'Completed'),
    ('test.patient4@medsync.test', 0, '10:00', 'Scheduled Visit', 'Scheduled')
) AS v(email, day_offset, start_time, appointment_type, appointment_status)
JOIN app_user pu ON pu.email = v.email
JOIN patient p ON p.user_id = pu.user_id
JOIN doctor d ON TRUE
JOIN app_user du ON du.user_id = d.user_id
        AND du.email = CASE
          WHEN v.email IN ('test.patient3@medsync.test', 'test.patient4@medsync.test')
          THEN 'test.doctor2@medsync.test'
          ELSE 'test.doctor@medsync.test'
        END
JOIN doctor_availability_slots s
  ON s.doctor_id = d.user_id
 AND s.date = CURRENT_DATE + v.day_offset
 AND s.start_time = v.start_time::time
WHERE NOT EXISTS (SELECT 1 FROM appointments a WHERE a.slot_id = s.slot_id);
