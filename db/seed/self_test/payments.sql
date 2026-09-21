INSERT INTO payments (invoice_id, amount_paid, payment_type)
SELECT i.invoice_id, v.amount_paid, v.payment_type::payment_type_enum
FROM invoices i
JOIN appointments a ON a.appointment_id = i.appointment_id
JOIN app_user pu ON pu.user_id = a.patient_id
JOIN (VALUES
    ('test.patient1@medsync.test', 1500.00::decimal, 'Cash'),
    ('test.patient1@medsync.test', 500.00::decimal, 'Insurance Settlement'),
    ('test.patient2@medsync.test', 1000.00::decimal, 'Card'),
    ('test.patient3@medsync.test', 3080.00::decimal, 'Card'),
    ('test.patient3@medsync.test', 4620.00::decimal, 'Insurance Settlement')
) AS v(email, amount_paid, payment_type) ON v.email = pu.email
WHERE NOT EXISTS (
    SELECT 1 FROM payments p
    WHERE p.invoice_id = i.invoice_id
      AND p.amount_paid = v.amount_paid
      AND p.payment_type = v.payment_type::payment_type_enum
);
