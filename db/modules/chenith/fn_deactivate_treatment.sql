-- FR-TCM-05: catalogue entries remain available for historical treatment rows.
CREATE OR REPLACE FUNCTION fn_deactivate_treatment(p_treatment_code INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE treatment_catalogue
    SET is_active = FALSE
    WHERE treatment_code = p_treatment_code;
END;
$$;