INSERT INTO payments (invoice_id, amount_paid, payment_type)
SELECT i.invoice_id,
       round((i.total_amount - i.insurance_amount) * 0.50, 2),
       CASE WHEN i.invoice_id % 2 = 0
            THEN 'Card'::payment_type_enum
            ELSE 'Cash'::payment_type_enum END
FROM invoices i
WHERE i.total_amount > i.insurance_amount
  AND NOT EXISTS (
      SELECT 1 FROM payments existing WHERE existing.invoice_id = i.invoice_id
  );
