INSERT INTO doctor_availability_slots (doctor_id, date, start_time, end_time, status)
SELECT d.user_id, CURRENT_DATE + v.day_offset, v.start_time::time, v.end_time::time,
       v.status::slot_status_enum
FROM doctor d
JOIN app_user u ON u.user_id = d.user_id
CROSS JOIN (VALUES
    (0, '09:00', '09:30', 'Booked'),
    (0, '10:00', '10:30', 'Booked'),
    (1, '09:00', '09:30', 'Open'),
    (1, '10:00', '10:30', 'Open'),
    (2, '14:00', '14:30', 'Open'),
    (3, '09:00', '09:30', 'Open'),
    (3, '10:00', '10:30', 'Open'),
    (4, '14:00', '14:30', 'Open')
) AS v(day_offset, start_time, end_time, status)
WHERE u.email = 'test.doctor@medsync.test'
  AND NOT EXISTS (
      SELECT 1 FROM doctor_availability_slots s
      WHERE s.doctor_id = d.user_id
        AND s.date = CURRENT_DATE + v.day_offset
        AND s.start_time = v.start_time::time
  );

INSERT INTO doctor_availability_slots (doctor_id, date, start_time, end_time, status)
SELECT d.user_id, CURRENT_DATE + v.day_offset, v.start_time::time, v.end_time::time,
       v.status::slot_status_enum
FROM doctor d
JOIN app_user u ON u.user_id = d.user_id
CROSS JOIN (VALUES
    (0, '09:00', '09:30', 'Booked'),
    (0, '10:00', '10:30', 'Open'),
    (1, '09:00', '09:30', 'Open'),
    (2, '14:00', '14:30', 'Blocked')
) AS v(day_offset, start_time, end_time, status)
WHERE u.email = 'test.doctor2@medsync.test'
  AND NOT EXISTS (
      SELECT 1 FROM doctor_availability_slots s
      WHERE s.doctor_id = d.user_id
        AND s.date = CURRENT_DATE + v.day_offset
        AND s.start_time = v.start_time::time
  );
