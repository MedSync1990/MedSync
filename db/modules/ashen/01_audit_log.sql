-- =============================================================================
-- 01_audit_log.sql — Audit log table
-- Module: Audit & RLS (Ashen)
-- =============================================================================
CREATE TABLE audit_log (
    audit_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name   VARCHAR(64)  NOT NULL,
    operation    VARCHAR(10)  NOT NULL,
    row_pk       VARCHAR(64)  NOT NULL,
    changed_by   VARCHAR(64),
    changed_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    old_data     JSONB,
    new_data     JSONB
);

CREATE INDEX idx_audit_table_time ON audit_log(table_name, changed_at);
