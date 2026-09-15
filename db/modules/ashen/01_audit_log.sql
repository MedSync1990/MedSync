-- =============================================================================
-- 01_audit_log.sql — Audit log table
-- Module: Audit & RLS (Ashen)
-- =============================================================================
-- Central table that records every INSERT, UPDATE, DELETE across audited tables.
-- Each row captures who changed what, when, and the before/after data as JSONB.
-- =============================================================================

CREATE TABLE audit_log (
    audit_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name   VARCHAR(64)  NOT NULL,
    operation    VARCHAR(10)  NOT NULL,  -- INSERT | UPDATE | DELETE
    row_pk       VARCHAR(64)  NOT NULL,  -- PK value of the affected row
    changed_by   VARCHAR(64),            -- app.current_user_id session variable
    changed_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    old_data     JSONB,                  -- NULL on INSERT
    new_data     JSONB                   -- NULL on DELETE
);

CREATE INDEX idx_audit_table_time ON audit_log(table_name, changed_at);
