-- =============================================================================
-- 07_pg_roles.sql — PostgreSQL roles & least-privilege grants
-- Module: Auth & Branch/Staff Management (Dilantha)
-- Ref:    database.md §3, §3.1
-- =============================================================================
-- Four DB-level roles, none is superuser:
--
--   catms_owner    — schema owner, runs migrations (DDL). CI/CD or DBA only.
--   catms_app      — application role for the FastAPI connection pool.
--                    App-level RBAC is enforced in the service layer.
--   catms_readonly  — read-only for reporting/BI tools.
--   catms_admin    — full-privilege role for Administrator-authenticated requests.
--
-- NOTE: Passwords below are placeholders ('<STRONG_PASSWORD>').
--       Replace with real secrets before deployment.
--
-- NOTE: This file only grants permissions on tables owned by this module
--       (role, branch, app_user, contact, staff). Grants for other modules'
--       tables will be applied by Ashen in the merge step (db/schema.sql).
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- Create roles (idempotent: DO block checks if role already exists)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catms_owner') THEN
        CREATE ROLE catms_owner WITH LOGIN PASSWORD '<STRONG_PASSWORD>' NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catms_app') THEN
        CREATE ROLE catms_app WITH LOGIN PASSWORD '<STRONG_PASSWORD>' NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catms_readonly') THEN
        CREATE ROLE catms_readonly WITH LOGIN PASSWORD '<STRONG_PASSWORD>' NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catms_admin') THEN
        CREATE ROLE catms_admin WITH LOGIN PASSWORD '<STRONG_PASSWORD>' NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Schema access
-- ─────────────────────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO catms_app, catms_readonly, catms_admin;


-- ─────────────────────────────────────────────────────────────────────────────
-- catms_app grants (this module's tables only)
-- No DELETE on staff (soft-delete only via fn_deactivate_staff)
-- ─────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON role, branch, app_user, contact, staff
    TO catms_app;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO catms_app;


-- ─────────────────────────────────────────────────────────────────────────────
-- catms_readonly grants (this module's tables only)
-- password_hash, failed_login_attempts, locked_until are excluded from staff
-- ─────────────────────────────────────────────────────────────────────────────

GRANT SELECT ON role, branch, app_user, staff TO catms_readonly;

-- Revoke sensitive columns from the reporting role
REVOKE SELECT (password_hash, failed_login_attempts, locked_until) ON staff
    FROM catms_readonly;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO catms_readonly;


-- ─────────────────────────────────────────────────────────────────────────────
-- catms_admin grants (full DML on this module's tables)
-- ─────────────────────────────────────────────────────────────────────────────

GRANT ALL PRIVILEGES ON role, branch, app_user, contact, staff TO catms_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO catms_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO catms_admin;
