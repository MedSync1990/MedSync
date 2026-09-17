-- Computes the aggregate charge from the price snapshot stored on each treatment line.
CREATE OR REPLACE FUNCTION fn_calculate_invoice_total(p_consultation_id INT)
RETURNS DECIMAL(10,2)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(SUM(ct.unit_price * ct.quantity), 0)
    FROM consultation_treatments ct
    WHERE ct.consultation_id = p_consultation_id;
$$;
