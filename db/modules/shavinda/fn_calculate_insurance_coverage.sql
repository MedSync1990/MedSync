
-- Computes total insurance covered amount for eligible treatments under active patient policy
CREATE OR REPLACE FUNCTION fn_calculate_insurance_coverage(
    p_patient_id       INT,
    p_consultation_id  INT
) RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_policy_id INT;
    v_insurance_id INT;
    v_total_covered DECIMAL(10,2) := 0;
BEGIN
    -- Locate patient's most recent policy entry
    SELECT insurance_id, policy_id INTO v_insurance_id, v_policy_id
    FROM patient_insurance
    WHERE patient_id = p_patient_id
    ORDER BY end_date DESC
    LIMIT 1;

    -- Return 0 coverage if patient has no policy or policy is expired
    IF v_insurance_id IS NULL OR NOT fn_is_policy_active(v_insurance_id) THEN
        RETURN 0;
    END IF;

    -- Sum covered portion across insurance-eligible consultation treatments
    SELECT COALESCE(SUM(
        ct.unit_price * ct.quantity * ptc.coverage_percentage / 100.0
    ), 0)
    INTO v_total_covered
    FROM consultation_treatments ct
    JOIN treatment_catalogue tc ON tc.treatment_code = ct.treatment_code
    LEFT JOIN policy_treatment_coverage ptc
        ON ptc.policy_id = v_policy_id AND ptc.treatment_code = ct.treatment_code
    WHERE ct.consultation_id = p_consultation_id
      AND tc.is_eligible_for_insurance
      AND ptc.coverage_percentage IS NOT NULL;

    RETURN v_total_covered;
END;
$$;
