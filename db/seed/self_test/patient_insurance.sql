INSERT INTO patient_insurance (
    patient_id, policy_id, insurance_card_number, start_date, end_date, is_active
)
SELECT p.user_id, i.policy_id, v.card_number,
       CURRENT_DATE - 30, CURRENT_DATE + 335, TRUE
FROM (VALUES
    ('test.patient1@medsync.test', 'Self-Test Gold Plan', 'SELF-CARD-0001'),
    ('test.patient2@medsync.test', 'Self-Test Basic Plan', 'SELF-CARD-0002'),
    ('test.patient3@medsync.test', 'Self-Test Silver Plan', 'SELF-CARD-0003')
) AS v(email, policy_name, card_number)
JOIN app_user u ON u.email = v.email
JOIN patient p ON p.user_id = u.user_id
JOIN insurance_policy_details i
  ON i.provider_name = 'Self-Test Insurance'
 AND i.policy_name = v.policy_name
WHERE NOT EXISTS (
    SELECT 1 FROM patient_insurance pi
    WHERE pi.insurance_card_number = v.card_number
);
