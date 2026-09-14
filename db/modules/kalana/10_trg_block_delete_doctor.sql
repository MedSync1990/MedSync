-- ============================================================================
-- Trigger & Function: trg_block_delete_doctor
-- Module: 02 - Doctor & Appointment Management
-- Owner: Kalana Jayawardena
-- Description: Guard against hard delete on DOCTOR table (FR-DMI-08 / AGENTS.md §2).
-- Reference: docs/database.md §7.10
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_block_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION '% rows cannot be hard-deleted — use the deactivate function/route instead', TG_TABLE_NAME
        USING ERRCODE = '23514';
END;
$$;

DROP TRIGGER IF EXISTS trg_block_delete_doctor ON doctor;
CREATE TRIGGER trg_block_delete_doctor
    BEFORE DELETE ON doctor 
    FOR EACH ROW 
    EXECUTE FUNCTION fn_block_hard_delete();
