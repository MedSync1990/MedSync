-- ============================================================================
-- Trigger & Function: trg_block_delete_doctor
-- Description: Guard against hard delete on DOCTOR table.
-- Owner: Kalana Jayawardena
-- ============================================================================

-- make the trigger execute the function before deletion on doctor.
DROP TRIGGER IF EXISTS trg_block_delete_doctor ON doctor;
CREATE TRIGGER trg_block_delete_doctor
    BEFORE DELETE ON doctor 
    FOR EACH ROW 
    EXECUTE FUNCTION fn_block_hard_delete();
