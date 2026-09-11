
-- Processes a payment against an invoice within an atomic transaction
CREATE OR REPLACE FUNCTION fn_record_payment(
    p_invoice_id    INT,
    p_amount        DECIMAL(10,2),
    p_payment_type  payment_type_enum
) RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total DECIMAL(10,2);
    v_insurance DECIMAL(10,2);
    v_paid_so_far DECIMAL(10,2);
    v_outstanding DECIMAL(10,2);
BEGIN
    -- Lock target invoice row to block race conditions on concurrent payments
    SELECT total_amount, insurance_amount INTO v_total, v_insurance
    FROM invoices WHERE invoice_id = p_invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'invoice % does not exist', p_invoice_id USING ERRCODE = 'P0002';
    END IF;

    -- Sum up all existing payment transactions for this invoice
    SELECT COALESCE(SUM(amount_paid), 0) INTO v_paid_so_far
    FROM payments WHERE invoice_id = p_invoice_id;

    -- Calculate remaining unpaid balance
    v_outstanding := v_total - v_insurance - v_paid_so_far;

    -- Validate payment amount > 0 and <= outstanding balance
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'payment amount must be positive' USING ERRCODE = '23514';
    END IF;

    IF p_amount > v_outstanding THEN
        RAISE EXCEPTION 'payment amount % exceeds outstanding balance %', p_amount, v_outstanding
            USING ERRCODE = '23514';
    END IF;

    -- Record the new payment transaction row
    INSERT INTO payments (invoice_id, amount_paid, payment_type)
    VALUES (p_invoice_id, p_amount, p_payment_type);

    -- Update status to Paid if fully settled, otherwise Partially Paid
    UPDATE invoices
    SET status = CASE
        WHEN (v_outstanding - p_amount) <= 0 THEN 'Paid'::invoice_status_enum
        ELSE 'Partially Paid'::invoice_status_enum
    END
    WHERE invoice_id = p_invoice_id;
END;
$$;
