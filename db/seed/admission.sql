INSERT INTO admission (patient_id, admit_date, discharge_date, reason, status)
SELECT p.user_id,
       CURRENT_DATE - sample.patient_number,
       CASE
           WHEN sample.patient_number % 2 = 0
           THEN CURRENT_DATE - sample.patient_number + 2
       END,
       CASE sample.patient_number
           WHEN 1 THEN 'Observation after routine procedure'
           WHEN 2 THEN 'Short-term monitoring'
           ELSE 'Diagnostic observation'
       END,
       CASE
           WHEN sample.patient_number % 2 = 0
           THEN 'Discharged'::admission_status_enum
           ELSE 'Admitted'::admission_status_enum
       END
FROM (
    SELECT user_id, row_number() OVER (ORDER BY user_id)::INT AS patient_number
    FROM patient
    ORDER BY user_id
    LIMIT 3
) AS sample
JOIN patient p ON p.user_id = sample.user_id
WHERE NOT EXISTS (
    SELECT 1
    FROM admission existing
    WHERE existing.patient_id = p.user_id
      AND existing.admit_date = CURRENT_DATE - sample.patient_number
);