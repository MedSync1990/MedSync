WITH numbered_patients AS (
  SELECT u.user_id, u.email, row_number() OVER (ORDER BY u.email) AS sequence
  FROM app_user u
  WHERE u.email LIKE 'patient%@medsync.test'
)
INSERT INTO patient_insurance (
    patient_id, policy_id, insurance_card_number, start_date, end_date, is_active
)
SELECT p.user_id, i.policy_id,
       'MED-CARD-' || lpad(row_number() OVER (ORDER BY pu.email)::text, 4, '0'),
       CURRENT_DATE - 30, CURRENT_DATE + 335, TRUE
FROM numbered_patients pu
JOIN patient p ON p.user_id = pu.user_id
JOIN insurance_policy_details i
  ON i.policy_name = 'MedShield Plan ' || lpad(pu.sequence::text, 2, '0')
  AND NOT EXISTS (
      SELECT 1 FROM patient_insurance existing
      WHERE existing.patient_id = p.user_id
  );
