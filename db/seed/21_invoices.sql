INSERT INTO invoices (consultation_id, appointment_id, total_amount, insurance_amount, status)
SELECT c.consultation_id,
       c.appointment_id,
       totals.total_amount,
       round(totals.total_amount * 0.50, 2),
       'Partially Paid'::invoice_status_enum
FROM consultations c
JOIN (
    SELECT consultation_id, round(sum(quantity * unit_price), 2) AS total_amount
    FROM consultation_treatments
    GROUP BY consultation_id
) totals ON totals.consultation_id = c.consultation_id
WHERE NOT EXISTS (
    SELECT 1 FROM invoices existing WHERE existing.appointment_id = c.appointment_id
);
