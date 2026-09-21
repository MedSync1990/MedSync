INSERT INTO admission (patient_id, admit_date, discharge_date, reason, status)
SELECT p.user_id, CURRENT_DATE - 10, CURRENT_DATE - 8,
       'Self-test observation admission', 'Discharged'::admission_status_enum
FROM patient p
JOIN app_user u ON u.user_id = p.user_id
WHERE u.email = 'test.patient1@medsync.test'
  AND NOT EXISTS (
      SELECT 1 FROM admission a
      WHERE a.patient_id = p.user_id AND a.reason = 'Self-test observation admission'
  );

INSERT INTO admission (patient_id, admit_date, reason, status)
SELECT p.user_id, CURRENT_DATE, 'Self-test active admission', 'Admitted'::admission_status_enum
FROM patient p
JOIN app_user u ON u.user_id = p.user_id
WHERE u.email = 'test.patient2@medsync.test'
  AND NOT EXISTS (
      SELECT 1 FROM admission a
      WHERE a.patient_id = p.user_id AND a.reason = 'Self-test active admission'
  );

    INSERT INTO admission (patient_id, admit_date, discharge_date, reason, status)
    SELECT p.user_id, CURRENT_DATE - 5, CURRENT_DATE - 3,
         'Self-test imaging observation', 'Discharged'::admission_status_enum
    FROM patient p
    JOIN app_user u ON u.user_id = p.user_id
    WHERE u.email = 'test.patient3@medsync.test'
      AND NOT EXISTS (
        SELECT 1 FROM admission a
        WHERE a.patient_id = p.user_id AND a.reason = 'Self-test imaging observation'
      );
