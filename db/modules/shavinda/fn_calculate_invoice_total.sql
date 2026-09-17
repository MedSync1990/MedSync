-- Computes the aggregate charge for all prescribed treatments on a consultation.
-- Price is sourced from treatment_catalogue (authoritative) rather than stored on the row.
CREATE OR REPLACE FUNCTION fn_calculate_invoice_total(p_consultation_id INT)
RETURNS DECIMAL(10,2)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(SUM(tc.price * ct.quantity), 0)
    FROM consultation_treatments ct
    JOIN treatment_catalogue tc ON tc.treatment_code = ct.treatment_code
    WHERE ct.consultation_id = p_consultation_id;
$$;
