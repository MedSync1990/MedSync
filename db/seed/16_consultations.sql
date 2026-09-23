INSERT INTO consultations (appointment_id, diagnosis, consultation_notes)
SELECT a.appointment_id,
       'Routine clinical review ' || row_number() OVER (ORDER BY a.appointment_id),
       'Seed consultation notes for end-to-end workflow testing.'
FROM appointments a
JOIN app_user pu ON pu.user_id = a.patient_id
WHERE pu.email LIKE 'patient%@medsync.test'
  AND a.status = 'Completed'::appointment_status_enum
  AND NOT EXISTS (
      SELECT 1 FROM consultations existing WHERE existing.appointment_id = a.appointment_id
  );
