-- =============================================================================
-- 02_branch.sql — Branch table
-- Module: Auth & Branch/Staff Management (Dilantha)
-- Ref:    database.md §2.1
-- =============================================================================
-- Each clinic location is a branch. Branches are never hard-deleted — they are
-- soft-deactivated via fn_deactivate_branch() (see 05_protection_functions.sql).
-- A BEFORE DELETE trigger (see 06_fn_block_delete.sql) prevents accidental
-- hard deletes at the DB level.
-- =============================================================================

CREATE TABLE branch (
    branch_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    address       VARCHAR(255) NOT NULL,
    phone_number  VARCHAR(10)  NOT NULL CHECK (phone_number ~ '^[0-9]{10}$'),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
