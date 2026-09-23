INSERT INTO doctor_availability_slots (doctor_id, date, start_time, end_time, status)
SELECT d.user_id,
       CURRENT_DATE + 1,
       (TIME '09:00' + ((row_number() OVER (ORDER BY u.email) - 1) * INTERVAL '30 minutes'))::time,
       (TIME '09:30' + ((row_number() OVER (ORDER BY u.email) - 1) * INTERVAL '30 minutes'))::time,
       'Booked'::slot_status_enum
FROM app_user u
JOIN doctor d ON d.user_id = u.user_id
WHERE u.email LIKE 'doctor%@medsync.test'
  AND NOT EXISTS (
      SELECT 1 FROM doctor_availability_slots existing
      WHERE existing.doctor_id = d.user_id
        AND existing.date = CURRENT_DATE + 1
  );
