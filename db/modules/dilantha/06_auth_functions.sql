-- =============================================================================
-- 06_auth_functions.sql — Login attempt tracking & account lockout
-- Module: Auth & Branch/Staff Management (Dilantha)
-- Ref:    database.md §7.11
-- =============================================================================
-- Password verification happens in the app layer (bcrypt/Argon2 comparison).
-- The DB never sees a plaintext password. This function only records the
-- *outcome* of a login attempt:
--   - On success: resets failed_login_attempts, clears lockout, updates last_login_at
--   - On failure: increments counter, locks account if threshold is reached
--
-- Lockout threshold (5 attempts) and duration (15 minutes) are placeholders —
-- confirm real values before shipping (see architecture.md §9).
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_register_login_attempt(
    p_username          VARCHAR(50),
    p_success           BOOLEAN,
    p_lockout_threshold SMALLINT DEFAULT 5
) RETURNS TABLE(is_locked BOOLEAN, locked_until TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id  INT;
    v_attempts SMALLINT;
BEGIN
    SELECT s.user_id, s.failed_login_attempts INTO v_user_id, v_attempts
    FROM staff s WHERE s.username = p_username
    FOR UPDATE;

    -- Unknown username: return generic result (no user enumeration)
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    -- Successful login: reset counters
    IF p_success THEN
        UPDATE staff
        SET failed_login_attempts = 0, locked_until = NULL, last_login_at = now()
        WHERE user_id = v_user_id;
        RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    -- Failed login: increment counter, lock if threshold reached
    UPDATE staff AS staff_row
    SET failed_login_attempts = staff_row.failed_login_attempts + 1,
        locked_until = CASE
            WHEN staff_row.failed_login_attempts + 1 >= p_lockout_threshold
                THEN now() + INTERVAL '15 minutes'
            ELSE staff_row.locked_until
        END
    WHERE staff_row.user_id = v_user_id
    RETURNING (staff_row.failed_login_attempts >= p_lockout_threshold), staff_row.locked_until
    INTO is_locked, locked_until;

    RETURN NEXT;
END;
$$;
