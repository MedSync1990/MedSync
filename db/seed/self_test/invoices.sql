INSERT INTO invoices (
    consultation_id, appointment_id, total_amount, insurance_amount, status
)
SELECT c.consultation_id, c.appointment_id,
       totals.total_amount,
       CASE pu.email
           WHEN 'test.patient1@medsync.test' THEN round(totals.total_amount * 0.80, 2)
           WHEN 'test.patient2@medsync.test' THEN round(totals.total_amount * 0.50, 2)
           WHEN 'test.patient3@medsync.test' THEN round(totals.total_amount * 0.60, 2)
           ELSE 0
       END,
       CASE pu.email
           WHEN 'test.patient1@medsync.test' THEN 'Partially Paid'::invoice_status_enum
           WHEN 'test.patient3@medsync.test' THEN 'Paid'::invoice_status_enum
           ELSE 'Unpaid'::invoice_status_enum
       END
FROM consultations c
JOIN appointments a ON a.appointment_id = c.appointment_id
JOIN app_user pu ON pu.user_id = a.patient_id
JOIN (
    SELECT ct.consultation_id, round(sum(ct.quantity * ct.unit_price), 2) AS total_amount
    FROM consultation_treatments ct
    GROUP BY ct.consultation_id
) totals ON totals.consultation_id = c.consultation_id
WHERE pu.email IN ('test.patient1@medsync.test', 'test.patient2@medsync.test', 'test.patient3@medsync.test')
  AND NOT EXISTS (
      SELECT 1 FROM invoices i WHERE i.appointment_id = c.appointment_id
  );
