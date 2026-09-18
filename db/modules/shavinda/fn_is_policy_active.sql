-- Evaluates policy validity against current date (source of truth is date range)
CREATE OR REPLACE FUNCTION fn_is_policy_active(p_insurance_id INT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT CURRENT_DATE BETWEEN start_date AND end_date
    FROM patient_insurance WHERE insurance_id = p_insurance_id;
$$;
