-- =============================================================================
-- 05_protection_functions.sql — Soft-delete & hard-delete prevention
-- Module: Auth & Branch/Staff Management (Dilantha)
-- Ref:    database.md §7.9, §7.10
-- =============================================================================
-- This file contains two layers of deletion protection:
--
-- Layer 1 (Soft-delete functions):
--   fn_deactivate_branch() — sets is_active=FALSE if no active staff remain
--   fn_deactivate_staff()  — sets is_active=FALSE on a staff member
--
-- Layer 2 (Hard-delete guard):
--   fn_block_hard_delete() — generic BEFORE DELETE trigger that unconditionally
--                            rejects any DELETE statement on protected tables
--
-- Together these ensure records are never lost — only deactivated.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- fn_deactivate_branch() — Ref: database.md §7.9
-- Checks for active staff before deactivating. Raises if any exist.
-- Called by the API route, never by a raw DELETE.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_deactivate_branch(p_branch_id INT) RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM staff WHERE branch_id = p_branch_id AND is_active) THEN
        RAISE EXCEPTION 'branch % has active staff assigned and cannot be deactivated', p_branch_id
            USING ERRCODE = '23514';
    END IF;
    UPDATE branch SET is_active = FALSE WHERE branch_id = p_branch_id;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- fn_deactivate_staff() — Ref: database.md §7.9
-- Simple soft-delete: sets is_active=FALSE on a staff member.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_deactivate_staff(p_user_id INT) RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE staff SET is_active = FALSE WHERE user_id = p_user_id;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- fn_block_hard_delete() — Ref: database.md §7.10
-- Generic trigger function: unconditionally rejects any hard DELETE.
-- Attached to branch and staff here; other tables (patient, treatment_catalogue,
-- doctor) will have their triggers added by their respective module owners.
-- ─────────────────────────────────────────────────────────────────────────────

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

-- Attach hard-delete guard to Dilantha's tables
CREATE TRIGGER trg_block_delete_branch
    BEFORE DELETE ON branch FOR EACH ROW EXECUTE FUNCTION fn_block_hard_delete();

CREATE TRIGGER trg_block_delete_staff
    BEFORE DELETE ON staff FOR EACH ROW EXECUTE FUNCTION fn_block_hard_delete();
