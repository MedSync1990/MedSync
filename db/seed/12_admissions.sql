WITH numbered_patients AS (
    SELECT u.user_id, row_number() OVER (ORDER BY u.email) AS sequence
    FROM app_user u
    WHERE u.email LIKE 'patient%@medsync.test'
)
INSERT INTO admission (patient_id, admit_date, discharge_date, reason, status)
SELECT p.user_id,
       CURRENT_DATE - np.sequence::int,
       CURRENT_DATE - np.sequence::int + 1,
       'Routine observation admission ' || np.sequence,
       'Discharged'::admission_status_enum
FROM numbered_patients np
JOIN patient p ON p.user_id = np.user_id
  AND NOT EXISTS (
      SELECT 1 FROM admission a
      WHERE a.patient_id = p.user_id
        AND a.reason = 'Routine observation admission ' || np.sequence
  );
