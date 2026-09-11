-- Computes the aggregate charge for all prescribed treatments on a consultation
CREATE OR REPLACE FUNCTION fn_calculate_invoice_total(p_consultation_id INT)
RETURNS DECIMAL(10,2)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(SUM(unit_price * quantity), 0)
    FROM consultation_treatments
    WHERE consultation_id = p_consultation_id;
$$;
