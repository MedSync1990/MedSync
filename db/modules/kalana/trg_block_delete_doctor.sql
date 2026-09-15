-- ============================================================================
-- Trigger & Function: trg_block_delete_doctor
-- Description: Guard against hard delete on DOCTOR table.
-- Owner: Kalana Jayawardena
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_block_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    -- TG_TABLE_NAME is a built-in dynamic variable that automatically inserts the name of the table that called it.
    RAISE EXCEPTION '% row (ID: %) cannot be hard-deleted — use the deactivate function/route instead', TG_TABLE_NAME, OLD.user_id
        USING ERRCODE = '23000'; --integrity constraint violation
END;
$$;

-- make the trigger execute the function before deletion on doctor.
DROP TRIGGER IF EXISTS trg_block_delete_doctor ON doctor;
CREATE TRIGGER trg_block_delete_doctor
    BEFORE DELETE ON doctor 
    FOR EACH ROW 
    EXECUTE FUNCTION fn_block_hard_delete();
