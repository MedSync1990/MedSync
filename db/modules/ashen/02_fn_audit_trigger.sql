-- =============================================================================
-- 02_fn_audit_trigger.sql — Generic audit trigger function
-- Module: Audit & RLS (Ashen)
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_pk TEXT;
BEGIN
    v_pk := COALESCE(
        (to_jsonb(COALESCE(NEW, OLD)) ->> TG_ARGV[0]),
        'unknown'
    );
    INSERT INTO audit_log (table_name, operation, row_pk, changed_by, old_data, new_data)
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        v_pk,
        current_setting('app.current_user_id', true),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;
