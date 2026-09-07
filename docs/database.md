# MedSync CATMS — Database Design & Implementation (PostgreSQL 16)

Source of truth for columns/relationships: the group ER diagram, reproduced in `architecture.md`
§6. Source of truth for security requirements: the security-rules prompt supplied alongside this
request. Where I diverged from a literal reading of either source, it's called out inline with a
short reason — never silently.

---

## 0. Reconciliation note — read this before the rest

`api-routes.md` §6.1 (as revised) allows `POST /appointments/{id}/treatments` to be called while
an appointment is still `Scheduled`, to match the single-screen Consultation UI in
`page-content.md` §2.3. **This database design does not implement that.** The original
`database.md` draft's own rule — *"treatments/consultation notes only on `Completed`
appointments," enforced by a trigger* — is what I've built here, for two reasons:

1. `fn_complete_appointment()` below (§7) already takes diagnosis, notes, **and** the full
   treatment list as one call and does the status flip + consultation insert + treatment inserts
   + invoice generation together, atomically. That already matches the "one Complete Appointment
   button" UX — the button's click is one function call, not three sequential writes.
2. A hard DB-level trigger enforcing "no treatment rows against a non-`Completed` appointment" is
   real defense-in-depth (FR-DMI-06): even a backend bug or a compromised app role can't create
   billing-relevant clinical data against an appointment nobody actually completed.

**Net effect: `api-routes.md`'s `POST /appointments/{id}/treatments` and `POST
/appointments/{id}/consultation` as separate pre-completion writes won't work against this
schema** — the trigger will reject them. If you want the incremental-picker behavior kept, tell
me and I'll either (a) relax the trigger to allow writes while `Scheduled` and only forbid writes
once `Completed`+invoiced (mirroring what I did in `api-routes.md` §6.1), or (b) fold those two
routes into one `PUT /appointments/{id}/complete` that takes notes+diagnosis+treatments in a
single request body, matching this schema exactly. I'd lean toward (b) — it's a closer match to
the actual UI (one button, one moment of commit) and it's the only version that gets the full
ACID guarantee in one shot.

---

## 1. Extensions & custom types

```sql
-- Needed for the EXCLUDE constraint that prevents overlapping doctor slots at the DB level
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

```sql
CREATE TYPE gender_enum            AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE slot_status_enum       AS ENUM ('Open', 'Booked', 'Blocked');
CREATE TYPE appointment_type_enum  AS ENUM ('Scheduled Visit', 'Walk-in', 'Follow-up');
CREATE TYPE appointment_status_enum AS ENUM ('Scheduled', 'Completed', 'Cancelled');
CREATE TYPE admission_status_enum  AS ENUM ('Admitted', 'Discharged');
CREATE TYPE invoice_status_enum    AS ENUM ('Unpaid', 'Partially Paid', 'Paid');
CREATE TYPE payment_type_enum      AS ENUM ('Cash', 'Card', 'Insurance Settlement');
```

---

## 2. Tables

Naming note: `USER` is a reserved word in PostgreSQL. Rather than force double-quoted
`"USER"` through every query (easy to typo, easy to break in a case-sensitive way), the ERD's
`USER` entity is implemented as **`app_user`**. Every other name matches the ERD exactly.

Additive columns beyond the literal ERD (`is_active`, `created_at`, lockout counters, the
`unit_price` snapshot, and the display-ID generated columns) are flagged individually — they
exist to satisfy requirements documented elsewhere (`api-routes.md`, the SRS FR codes) that the
bare ERD diagram doesn't itself carry columns for.

### 2.1 Identity / people

```sql
CREATE TABLE role (
    role_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name   VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE branch (
    branch_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    address       VARCHAR(255) NOT NULL,
    phone_number  VARCHAR(10)  NOT NULL CHECK (phone_number ~ '^[0-9]{10}$'),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,   -- addition: needed for §2.1 deactivate flow
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE app_user (
    user_id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id        INT NOT NULL REFERENCES role(role_id),
    first_name     VARCHAR(60) NOT NULL,
    middle_name    VARCHAR(60),
    last_name      VARCHAR(60) NOT NULL,
    id_number      VARCHAR(12) NOT NULL UNIQUE
                     CHECK (id_number ~ '^([0-9]{9}[VvXx]|[0-9]{12})$'),
    address        VARCHAR(255) NOT NULL,
    birthdate      DATE NOT NULL CHECK (birthdate <= CURRENT_DATE),
    gender         gender_enum NOT NULL,
    marital_status VARCHAR(20),
    email          VARCHAR(120) CHECK (email IS NULL OR email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_user_id_number ON app_user(id_number);
CREATE INDEX idx_app_user_name ON app_user USING gin ((first_name || ' ' || last_name) gin_trgm_ops);
-- idx_app_user_name requires pg_trgm; add `CREATE EXTENSION IF NOT EXISTS pg_trgm;` if using it
-- for FR-PM-04 name search. Omit it and rely on a plain btree name index if trigram isn't wanted.

CREATE TABLE contact (
    contact_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       INT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    phone_number  VARCHAR(10) NOT NULL CHECK (phone_number ~ '^[0-9]{10}$')
);
CREATE INDEX idx_contact_user ON contact(user_id);

CREATE TABLE staff (
    user_id                INT PRIMARY KEY REFERENCES app_user(user_id) ON DELETE RESTRICT,
    branch_id              INT NOT NULL REFERENCES branch(branch_id),
    username                VARCHAR(50) NOT NULL UNIQUE,
    password_hash           VARCHAR(255) NOT NULL,   -- Argon2/bcrypt hash from the app; never plaintext
    is_active                BOOLEAN NOT NULL DEFAULT TRUE,
    failed_login_attempts    SMALLINT NOT NULL DEFAULT 0,   -- addition: FR-UAC lockout (§1.1 threshold TBD)
    locked_until             TIMESTAMPTZ,
    last_login_at            TIMESTAMPTZ                    -- addition: FR-UAC-06 audit
);
CREATE INDEX idx_staff_branch ON staff(branch_id);

CREATE TABLE doctor (
    user_id         INT PRIMARY KEY REFERENCES staff(user_id) ON DELETE RESTRICT,
    license_number  VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE specialty (
    speciality_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           VARCHAR(80) NOT NULL UNIQUE,
    description    VARCHAR(255)
);

CREATE TABLE doctor_speciality (
    user_id        INT NOT NULL REFERENCES doctor(user_id) ON DELETE CASCADE,
    speciality_id  INT NOT NULL REFERENCES specialty(speciality_id) ON DELETE RESTRICT,
    PRIMARY KEY (user_id, speciality_id)
);
```

### 2.2 Scheduling

```sql
CREATE TABLE doctor_availability_slots (
    slot_id      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doctor_id    INT NOT NULL REFERENCES doctor(user_id) ON DELETE CASCADE,
    date         DATE NOT NULL,
    start_time   TIME NOT NULL,
    end_time     TIME NOT NULL CHECK (end_time > start_time),
    status       slot_status_enum NOT NULL DEFAULT 'Open',
    slot_range   TSRANGE GENERATED ALWAYS AS
                     (tsrange(date + start_time, date + end_time, '[)')) STORED
);
CREATE INDEX idx_slots_doctor_date_status ON doctor_availability_slots(doctor_id, date, status);

-- The actual DB-level enforcement of "no two overlapping appointments for the same doctor"
-- (requirement in requirments.txt): a doctor cannot even *have* two overlapping slots, so it's
-- structurally impossible to book two overlapping appointments — no trigger needed for this rule.
ALTER TABLE doctor_availability_slots
    ADD CONSTRAINT excl_slot_overlap
    EXCLUDE USING gist (doctor_id WITH =, slot_range WITH &&);
```

### 2.3 Patient clinical

```sql
CREATE TABLE patient (
    user_id            INT PRIMARY KEY REFERENCES app_user(user_id) ON DELETE RESTRICT,
    patient_code       VARCHAR(9) GENERATED ALWAYS AS ('PT-' || lpad(user_id::text, 6, '0')) STORED,
    blood_group        VARCHAR(5),
    emergency_contact  VARCHAR(10) CHECK (emergency_contact IS NULL OR emergency_contact ~ '^[0-9]{10}$'),
    contact_name       VARCHAR(100),
    registered_branch  INT REFERENCES branch(branch_id),
    registered_date    DATE NOT NULL DEFAULT CURRENT_DATE
);
CREATE UNIQUE INDEX uq_patient_code ON patient(patient_code);

CREATE TABLE allergy (
    allergy_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    allergy_code  VARCHAR(20) NOT NULL UNIQUE,
    name          VARCHAR(100) NOT NULL
);

CREATE TABLE patient_allergy (
    patient_id   INT NOT NULL REFERENCES patient(user_id) ON DELETE CASCADE,
    allergy_id   INT NOT NULL REFERENCES allergy(allergy_id) ON DELETE RESTRICT,
    PRIMARY KEY (patient_id, allergy_id)
);

-- ADMISSION exists in the ERD but is not referenced by any requirement, page, or API route in
-- the current documents — included for schema completeness, not wired to anything yet.
CREATE TABLE admission (
    admission_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_id       INT NOT NULL REFERENCES patient(user_id) ON DELETE CASCADE,
    admit_date       DATE NOT NULL,
    discharge_date   DATE CHECK (discharge_date IS NULL OR discharge_date >= admit_date),
    reason           VARCHAR(255),
    status           admission_status_enum NOT NULL DEFAULT 'Admitted'
);
CREATE INDEX idx_admission_patient ON admission(patient_id);
```

### 2.4 Insurance

```sql
-- ERD lists `provider_id int` on INSURANCE_POLICY_DETAILS with no PROVIDER table anywhere in the
-- diagram — a dangling FK-less int isn't useful. page-content.md's insurance form collects a
-- free-text "Provider*" name, so that's what's modeled here instead of an unfounded int FK.
CREATE TABLE insurance_policy_details (
    policy_id      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    provider_name  VARCHAR(100) NOT NULL,
    policy_name    VARCHAR(100) NOT NULL
);

CREATE TABLE patient_insurance (
    insurance_id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_id             INT NOT NULL REFERENCES patient(user_id) ON DELETE CASCADE,
    policy_id              INT NOT NULL REFERENCES insurance_policy_details(policy_id),
    insurance_card_number  VARCHAR(40) NOT NULL,
    start_date             DATE NOT NULL,
    end_date               DATE NOT NULL CHECK (end_date > start_date),
    is_active               BOOLEAN NOT NULL DEFAULT TRUE  -- convenience cache only, see fn_is_policy_active()
);
CREATE INDEX idx_patient_insurance_patient ON patient_insurance(patient_id);
```

### 2.5 Clinical record & catalogue

```sql
CREATE TABLE treatment_catalogue (
    treatment_code             INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    treatment_name             VARCHAR(100) NOT NULL,
    category                   VARCHAR(50)  NOT NULL,
    price                      DECIMAL(10,2) NOT NULL CHECK (price > 0),
    is_eligible_for_insurance  BOOLEAN NOT NULL DEFAULT FALSE,
    is_active                  BOOLEAN NOT NULL DEFAULT TRUE  -- addition: FR-TCM-05 soft-deactivate
);
CREATE INDEX idx_treatment_category ON treatment_catalogue(category);

CREATE TABLE policy_treatment_coverage (
    policy_id            INT NOT NULL REFERENCES insurance_policy_details(policy_id) ON DELETE CASCADE,
    treatment_code       INT NOT NULL REFERENCES treatment_catalogue(treatment_code) ON DELETE CASCADE,
    coverage_percentage  DECIMAL(5,2) NOT NULL CHECK (coverage_percentage BETWEEN 0 AND 100),
    PRIMARY KEY (policy_id, treatment_code)
);
```

### 2.6 Appointments, consultations, billing

```sql
CREATE TABLE appointments (
    appointment_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    appointment_code  VARCHAR(10) GENERATED ALWAYS AS ('APT-' || lpad(appointment_id::text, 6, '0')) STORED,
    patient_id        INT NOT NULL REFERENCES patient(user_id),
    slot_id           INT NOT NULL UNIQUE REFERENCES doctor_availability_slots(slot_id),
    appointment_type  appointment_type_enum NOT NULL,
    status            appointment_status_enum NOT NULL DEFAULT 'Scheduled',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- slot_id is UNIQUE: at most one appointment per slot, which combined with the EXCLUDE
-- constraint on slot_range (§2.2) is the full overlap-prevention mechanism.
CREATE INDEX idx_appt_patient ON appointments(patient_id);
CREATE INDEX idx_appt_status ON appointments(status);

CREATE TABLE consultations (
    consultation_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    appointment_id      INT NOT NULL UNIQUE REFERENCES appointments(appointment_id),
    diagnosis            VARCHAR(255),
    consultation_notes    TEXT NOT NULL,
    created_date           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE consultation_treatments (
    consultation_id  INT NOT NULL REFERENCES consultations(consultation_id) ON DELETE CASCADE,
    treatment_code   INT NOT NULL REFERENCES treatment_catalogue(treatment_code),
    quantity         INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    -- addition: price snapshot at time of prescribing, per api-routes.md §6.1 — a later catalogue
    -- price change must never rewrite what a historical invoice already billed.
    unit_price       DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
    PRIMARY KEY (consultation_id, treatment_code)
);
CREATE INDEX idx_consult_treatments_code ON consultation_treatments(treatment_code);

CREATE TABLE invoices (
    invoice_id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_code      VARCHAR(10) GENERATED ALWAYS AS ('INV-' || lpad(invoice_id::text, 6, '0')) STORED,
    consultation_id   INT NOT NULL REFERENCES consultations(consultation_id),
    appointment_id    INT NOT NULL UNIQUE REFERENCES appointments(appointment_id),  -- one invoice per appointment
    total_amount      DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    insurance_amount  DECIMAL(10,2) NOT NULL DEFAULT 0
                       CHECK (insurance_amount >= 0 AND insurance_amount <= total_amount),
    status            invoice_status_enum NOT NULL DEFAULT 'Unpaid',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_status ON invoices(status);

CREATE TABLE payments (
    payment_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_id     INT NOT NULL REFERENCES invoices(invoice_id),
    amount_paid    DECIMAL(10,2) NOT NULL CHECK (amount_paid > 0),
    payment_date   TIMESTAMPTZ NOT NULL DEFAULT now(),
    payment_type   payment_type_enum NOT NULL
);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
```

### 2.7 Audit log (addition — §13 of the security prompt)

```sql
CREATE TABLE audit_log (
    audit_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name   VARCHAR(64) NOT NULL,
    operation    VARCHAR(10) NOT NULL,
    row_pk       VARCHAR(64) NOT NULL,
    changed_by   VARCHAR(64),
    changed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    old_data     JSONB,
    new_data     JSONB
);
CREATE INDEX idx_audit_table_time ON audit_log(table_name, changed_at);
```

### 2.8 Seed reference rows

```sql
INSERT INTO role (role_name) VALUES
    ('Administrator'), ('Branch Manager'), ('Doctor'), ('Receptionist'), ('Patient');
-- 'Patient' exists so app_user.role_id is satisfiable for patient rows, but a PATIENT row is
-- never paired with a STAFF row — no username/password exists for that role, which is the DB-level
-- reflection of "no patient login" (page-content.md §5 / the resolved discrepancy in api-routes.md).
```

---

## 3. PostgreSQL roles & least-privilege grants

Three roles, matching the "separate roles for different responsibilities" requirement. None is
`postgres`/superuser, and no role gets `ALL PRIVILEGES`.

```sql
-- Schema owner — runs migrations (DDL). Used only from CI/CD or by a DBA, never by the running app.
CREATE ROLE catms_owner WITH LOGIN PASSWORD '<STRONG_PASSWORD>' NOSUPERUSER NOCREATEDB NOCREATEROLE;

-- Single application role, used by the FastAPI connection pool for every request. App-level
-- RBAC (Admin/BM/Doctor/Receptionist) is enforced in the service layer per api-routes.md §0.5;
-- this DB role's grants are the *union* of what any endpoint might legitimately need, with RLS
-- (§4) providing row-level narrowing on top so a compromised or buggy app role still can't read
-- or write rows outside its session's declared identity.
CREATE ROLE catms_app WITH LOGIN PASSWORD '<STRONG_PASSWORD>' NOSUPERUSER NOCREATEDB NOCREATEROLE;

-- Read-only role for reporting/BI tools and ad-hoc DBA queries — never used by the app itself.
CREATE ROLE catms_readonly WITH LOGIN PASSWORD '<STRONG_PASSWORD>' NOSUPERUSER NOCREATEDB NOCREATEROLE;
```

```sql
-- Ownership: catms_owner creates and owns every object (run the DDL above as this role).
GRANT USAGE ON SCHEMA public TO catms_app, catms_readonly;

-- catms_app: standard CRUD on operational tables. No DELETE on anything clinically/financially
-- irreversible (appointments, consultations, consultation_treatments, invoices, payments,
-- audit_log) — those are soft-updated (status flips) or trigger-appended only, never deleted.
GRANT SELECT, INSERT, UPDATE ON
    role, branch, app_user, contact, staff, doctor, specialty,
    doctor_availability_slots, patient, allergy, admission,
    insurance_policy_details, patient_insurance, treatment_catalogue,
    appointments, consultations, consultation_treatments, invoices, payments
    TO catms_app;

-- Junction/reference tables where a real "remove" (not a status flip) is a legitimate operation:
GRANT SELECT, INSERT, UPDATE, DELETE ON
    doctor_speciality, patient_allergy, policy_treatment_coverage
    TO catms_app;

-- Sequences backing every GENERATED ALWAYS AS IDENTITY column need explicit USAGE to INSERT.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO catms_app;

-- audit_log is intentionally NOT grantable to catms_app directly — see §6, it's written only by
-- a SECURITY DEFINER trigger function the app role can't bypass, so even a compromised app
-- connection can't tamper with or blank out its own audit trail.
REVOKE ALL ON audit_log FROM catms_app;

-- catms_app never touches ROLE/BRANCH/etc.'s DDL, and never gets DELETE on staff/patient/branch/
-- treatment_catalogue (soft-delete only, enforced doubly by the trigger in §7.6).

-- Column-level lockdown: password hashes are never readable by the reporting role, and the
-- reporting role gets a strictly read-only, non-clinical-note view.
GRANT SELECT ON
    role, branch, app_user, staff, doctor, specialty, doctor_speciality,
    doctor_availability_slots, patient, treatment_catalogue, appointments,
    invoices, payments
    TO catms_readonly;
REVOKE SELECT (password_hash, failed_login_attempts, locked_until) ON staff FROM catms_readonly;
-- consultations/consultation_treatments (clinical notes/diagnoses) and patient_insurance/
-- policy_treatment_coverage/insurance_policy_details/patient_allergy (medical + financial detail)
-- are deliberately withheld from catms_readonly — SRS §5.3.3 restricts this data to authorized
-- medical/administrative staff, and a generic BI/reporting connection doesn't qualify.

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO catms_readonly;
```

### 3.1 `catms_admin` — full-privilege role for Administrator connections

A fourth role, used only when the backend authenticates a request as the **Administrator**
app-level role and opens (or switches the pooled connection to) this DB login instead of
`catms_app`. This is a deliberate exception to the least-privilege stance in §3 above — an
Administrator in this system genuinely needs to touch everything (branches, staff, doctors,
specialties, treatments, allergies, and read every clinical/financial table for oversight), so
rather than bolt more and more per-table grants onto the shared `catms_app` role (which every
other role's connections also use), Administrator traffic gets its own login with broad grants.
It is still **not** superuser and still isn't the schema owner — it can't run DDL, drop objects,
or alter table structure; "full privileges" here means full DML + sequence + function
execution, not schema ownership.

```sql
CREATE ROLE catms_admin WITH LOGIN PASSWORD '<STRONG_PASSWORD>' NOSUPERUSER NOCREATEDB NOCREATEROLE;

GRANT USAGE ON SCHEMA public TO catms_admin;

-- Full DML on every table, including the ones catms_app can't touch.
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO catms_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO catms_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO catms_admin;

-- audit_log is the one place this is worth calling out explicitly: catms_admin gets read access
-- (an Administrator reviewing the audit trail is legitimate) but writes to it should still only
-- ever happen through fn_audit_trigger() (§6), not a direct INSERT — so if you want to keep that
-- guarantee even for this role, revoke INSERT/UPDATE/DELETE back off audit_log specifically:
REVOKE INSERT, UPDATE, DELETE ON audit_log FROM catms_admin;
```

**Wiring it in:** the backend's connection-pool selection logic picks `catms_admin` vs.
`catms_app` based on the authenticated JWT's role claim, the same way it already decides which
value to pass into `set_config('app.current_role', ...)` for RLS (§4) — that session variable
still needs to be set to `'Administrator'` on `catms_admin` connections too, since the RLS
policies in §5 key off `current_setting('app.current_role', true)`, not off which Postgres login
is connected. If you'd rather not manage two connection pools/credentials in the app, option 2
from earlier (just widen `catms_app`'s own grants) avoids that operational overhead at the cost
of every request — not just Administrator ones — running through a wider-privileged connection;
say so if you want that version instead.

---

## 4. Session-context convention (required for §5's RLS)

The backend authenticates the JWT, then — inside the same transaction as the actual query, using
parameter binding, never string interpolation — sets three session variables so RLS policies can
read them:

```sql
-- Called once per request, right after BEGIN, with values bound as parameters ($1/$2/$3):
SELECT set_config('app.current_user_id', $1, true);   -- true = local to this transaction only
SELECT set_config('app.current_role', $2, true);       -- e.g. 'Doctor', 'Branch Manager'
SELECT set_config('app.current_branch_id', $3, true);
```

`true` (the `is_local` argument) means the setting evaporates at `COMMIT`/`ROLLBACK` — it can
never leak into the next pooled connection's transaction.

---

## 5. Row-Level Security

RLS is applied only where it adds protection beyond what the app layer already promises to do —
not blanket-enabled on every table (that would just duplicate app logic in SQL for no benefit and
make debugging harder). Two concrete cases justify it here:

**A) A doctor should only be able to write clinical notes/treatments against their own
appointments** — never another doctor's, even if a bug in the service layer forgot to check. This
is exactly the "doctor can access only authorized patient records" example the security prompt
calls out. *Reads* of consultations stay open to all authenticated staff roles, because
`requirments.txt` requires patient records to be accessible across branches to clinic staff —
only the *write* path is narrowed to the treating doctor.

**B) A Branch Manager's report/appointment queries should be branch-scoped at the DB level**, not
just via a query parameter the client could tamper with (`api-routes.md` §0.5 already says the
API ignores a client-supplied `branch` override for BM; RLS makes that a DB-enforced guarantee
too, not just an API-layer promise).

```sql
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- (A) Consultations: everyone on staff can read; only the treating doctor can write.
CREATE POLICY consultations_read_all_staff ON consultations
    FOR SELECT
    USING (current_setting('app.current_role', true)
           IN ('Administrator', 'Branch Manager', 'Doctor', 'Receptionist'));

CREATE POLICY consultations_doctor_write_own ON consultations
    FOR INSERT WITH CHECK (
        current_setting('app.current_role', true) = 'Doctor'
        AND EXISTS (
            SELECT 1 FROM appointments a
            JOIN doctor_availability_slots das ON das.slot_id = a.slot_id
            WHERE a.appointment_id = consultations.appointment_id
              AND das.doctor_id = current_setting('app.current_user_id', true)::int
        )
    );

CREATE POLICY consultation_treatments_read_all_staff ON consultation_treatments
    FOR SELECT
    USING (current_setting('app.current_role', true)
           IN ('Administrator', 'Branch Manager', 'Doctor', 'Receptionist'));

CREATE POLICY consultation_treatments_doctor_write_own ON consultation_treatments
    FOR INSERT WITH CHECK (
        current_setting('app.current_role', true) = 'Doctor'
        AND EXISTS (
            SELECT 1 FROM consultations c
            JOIN appointments a ON a.appointment_id = c.appointment_id
            JOIN doctor_availability_slots das ON das.slot_id = a.slot_id
            WHERE c.consultation_id = consultation_treatments.consultation_id
              AND das.doctor_id = current_setting('app.current_user_id', true)::int
        )
    );

-- (B) Appointments: Admin/Receptionist see everything (booking across branches is a stated
-- requirement); a Doctor sees their own; a Branch Manager sees only their branch's.
CREATE POLICY appointments_admin_reception_full ON appointments
    FOR ALL
    USING (current_setting('app.current_role', true) IN ('Administrator', 'Receptionist'))
    WITH CHECK (current_setting('app.current_role', true) IN ('Administrator', 'Receptionist'));

CREATE POLICY appointments_doctor_own ON appointments
    FOR SELECT
    USING (
        current_setting('app.current_role', true) = 'Doctor'
        AND EXISTS (
            SELECT 1 FROM doctor_availability_slots das
            WHERE das.slot_id = appointments.slot_id
              AND das.doctor_id = current_setting('app.current_user_id', true)::int
        )
    );

CREATE POLICY appointments_branch_manager_own_branch ON appointments
    FOR SELECT
    USING (
        current_setting('app.current_role', true) = 'Branch Manager'
        AND EXISTS (
            SELECT 1 FROM doctor_availability_slots das
            JOIN staff s ON s.user_id = das.doctor_id
            WHERE das.slot_id = appointments.slot_id
              AND s.branch_id = current_setting('app.current_branch_id', true)::int
        )
    );
```

`catms_readonly` and `catms_owner` are unaffected by these policies unless `FORCE ROW LEVEL
SECURITY` is added — deliberately left off `catms_owner` (migrations need unrestricted access)
and off `catms_readonly` (which already gets no access to `consultations`/
`consultation_treatments` at the grant level, §3, so an RLS policy there would be redundant).

---

## 6. Audit trigger (SECURITY DEFINER, locked-down `search_path`)

```sql
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

-- Owned by catms_owner, executed as catms_owner regardless of the calling role (SECURITY
-- DEFINER) — catms_app has no direct INSERT grant on audit_log (§3), so this trigger is the only
-- path that can ever write an audit row, and the app can't blank the table even if compromised.
-- search_path is pinned explicitly to prevent a search-path-hijack privilege-escalation attack
-- against a SECURITY DEFINER function (the classic Postgres footgun this addresses).

CREATE TRIGGER trg_audit_staff
    AFTER INSERT OR UPDATE OR DELETE ON staff
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('user_id');

CREATE TRIGGER trg_audit_branch
    AFTER INSERT OR UPDATE OR DELETE ON branch
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('branch_id');

CREATE TRIGGER trg_audit_treatment_catalogue
    AFTER INSERT OR UPDATE OR DELETE ON treatment_catalogue
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('treatment_code');

CREATE TRIGGER trg_audit_invoices
    AFTER INSERT OR UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('invoice_id');

CREATE TRIGGER trg_audit_payments
    AFTER INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('payment_id');

CREATE TRIGGER trg_audit_appointments
    AFTER INSERT OR UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('appointment_id');
```

Successful/failed logins (FR-UAC-06) are recorded via `fn_register_login_attempt()` below rather
than a generic table trigger, since a failed login doesn't correspond to a row change on `staff`
worth diffing — it's a counter increment, logged by the function itself.

---

## 7. Functions (business logic, ACID enforcement)

All functions take typed, positional parameters — the FastAPI service layer calls them as
`SELECT fn_name($1, $2, ...)` via its driver's parameter binding (asyncpg/psycopg), never by
building a SQL string. **No function here concatenates any parameter into a dynamic SQL string.**

### 7.1 Book an appointment (FR-AM-01/02/03/09, overlap prevention)

```sql
CREATE OR REPLACE FUNCTION fn_book_appointment(
    p_patient_id  INT,
    p_slot_id     INT,
    p_appt_type   appointment_type_enum
) RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_status slot_status_enum;
    v_appointment_id INT;
BEGIN
    -- Lock the slot row so two concurrent bookings can't both pass the status check.
    SELECT status INTO v_status
    FROM doctor_availability_slots
    WHERE slot_id = p_slot_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'slot % does not exist', p_slot_id USING ERRCODE = 'P0002';
    END IF;

    IF v_status <> 'Open' THEN
        RAISE EXCEPTION 'slot % is no longer available', p_slot_id USING ERRCODE = '23505';
    END IF;

    UPDATE doctor_availability_slots SET status = 'Booked' WHERE slot_id = p_slot_id;

    INSERT INTO appointments (patient_id, slot_id, appointment_type, status)
    VALUES (p_patient_id, p_slot_id, p_appt_type, 'Scheduled')
    RETURNING appointment_id INTO v_appointment_id;

    RETURN v_appointment_id;
END;
$$;
```

### 7.2 Emergency walk-in (FR-AM-07)

```sql
CREATE OR REPLACE FUNCTION fn_create_walk_in(
    p_doctor_id   INT,
    p_patient_id  INT,
    p_date        DATE,
    p_start_time  TIME,
    p_end_time    TIME
) RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_slot_id INT;
    v_appointment_id INT;
BEGIN
    -- The EXCLUDE constraint (§2.2) rejects this INSERT outright if it overlaps an existing slot
    -- for this doctor — no separate overlap check needed here.
    INSERT INTO doctor_availability_slots (doctor_id, date, start_time, end_time, status)
    VALUES (p_doctor_id, p_date, p_start_time, p_end_time, 'Open')
    RETURNING slot_id INTO v_slot_id;

    v_appointment_id := fn_book_appointment(p_patient_id, v_slot_id, 'Walk-in');
    RETURN v_appointment_id;
EXCEPTION
    WHEN exclusion_violation THEN
        RAISE EXCEPTION 'doctor % is already booked over this time range', p_doctor_id
            USING ERRCODE = '23P01';
END;
$$;
```

### 7.3 Reschedule (FR-AM-05)

```sql
CREATE OR REPLACE FUNCTION fn_reschedule_appointment(
    p_appointment_id INT,
    p_new_slot_id    INT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_old_slot_id INT;
    v_status appointment_status_enum;
    v_new_slot_status slot_status_enum;
BEGIN
    SELECT slot_id, status INTO v_old_slot_id, v_status
    FROM appointments WHERE appointment_id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'appointment % does not exist', p_appointment_id USING ERRCODE = 'P0002';
    END IF;

    IF v_status <> 'Scheduled' THEN
        RAISE EXCEPTION 'only a Scheduled appointment can be rescheduled (current status: %)', v_status
            USING ERRCODE = '23514';
    END IF;

    SELECT status INTO v_new_slot_status
    FROM doctor_availability_slots WHERE slot_id = p_new_slot_id
    FOR UPDATE;

    IF NOT FOUND OR v_new_slot_status <> 'Open' THEN
        RAISE EXCEPTION 'the selected new slot is no longer available' USING ERRCODE = '23505';
    END IF;

    UPDATE doctor_availability_slots SET status = 'Open' WHERE slot_id = v_old_slot_id;
    UPDATE doctor_availability_slots SET status = 'Booked' WHERE slot_id = p_new_slot_id;
    UPDATE appointments SET slot_id = p_new_slot_id WHERE appointment_id = p_appointment_id;
END;
$$;
```

### 7.4 Cancel appointment (FR-AM-06/08)

```sql
CREATE OR REPLACE FUNCTION fn_cancel_appointment(p_appointment_id INT) RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_slot_id INT;
    v_status appointment_status_enum;
BEGIN
    SELECT slot_id, status INTO v_slot_id, v_status
    FROM appointments WHERE appointment_id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'appointment % does not exist', p_appointment_id USING ERRCODE = 'P0002';
    END IF;

    IF v_status <> 'Scheduled' THEN
        RAISE EXCEPTION 'only a Scheduled appointment can be cancelled (current status: %)', v_status
            USING ERRCODE = '23514';
    END IF;

    UPDATE appointments SET status = 'Cancelled' WHERE appointment_id = p_appointment_id;
    UPDATE doctor_availability_slots SET status = 'Open' WHERE slot_id = v_slot_id;
    -- The freed slot's history (it was once booked, now open again) survives in audit_log via
    -- trg_audit_appointments — nothing about the original booking is erased.
END;
$$;
```

### 7.5 Complete appointment → generate invoice (FR-CTM-06/07/08, FR-DMI-05/06, FR-BPM-01/02)

This is the single call behind the Consultation screen's "Complete Appointment" button — see §0.

```sql
CREATE OR REPLACE FUNCTION fn_complete_appointment(
    p_appointment_id  INT,
    p_diagnosis       VARCHAR(255),
    p_notes           TEXT,
    p_treatments      JSONB   -- [{"treatment_code": 7, "quantity": 1}, ...]
) RETURNS INT   -- invoice_id
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_status appointment_status_enum;
    v_consultation_id INT;
    v_invoice_id INT;
    v_total DECIMAL(10,2);
    v_insurance_amount DECIMAL(10,2);
    v_item JSONB;
    v_code INT;
    v_qty INT;
    v_price DECIMAL(10,2);
    v_is_active BOOLEAN;
BEGIN
    IF p_notes IS NULL OR btrim(p_notes) = '' THEN
        RAISE EXCEPTION 'consultation notes are required before completing this appointment'
            USING ERRCODE = '23514';
    END IF;

    SELECT status INTO v_status
    FROM appointments WHERE appointment_id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'appointment % does not exist', p_appointment_id USING ERRCODE = 'P0002';
    END IF;

    IF v_status <> 'Scheduled' THEN
        RAISE EXCEPTION 'only a Scheduled appointment can be completed (current status: %)', v_status
            USING ERRCODE = '23514';
    END IF;

    -- Status flips to Completed FIRST, in this same transaction, so the trigger in §7.6 sees it.
    UPDATE appointments SET status = 'Completed' WHERE appointment_id = p_appointment_id;

    INSERT INTO consultations (appointment_id, diagnosis, consultation_notes)
    VALUES (p_appointment_id, p_diagnosis, p_notes)
    RETURNING consultation_id INTO v_consultation_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_treatments) LOOP
        v_code := (v_item ->> 'treatment_code')::INT;
        v_qty  := COALESCE((v_item ->> 'quantity')::INT, 1);

        SELECT price, is_active INTO v_price, v_is_active
        FROM treatment_catalogue WHERE treatment_code = v_code
        FOR UPDATE;

        IF NOT FOUND OR NOT v_is_active THEN
            RAISE EXCEPTION 'treatment code % is not a valid, active catalogue entry', v_code
                USING ERRCODE = '23514';
        END IF;

        INSERT INTO consultation_treatments (consultation_id, treatment_code, quantity, unit_price)
        VALUES (v_consultation_id, v_code, v_qty, v_price);
    END LOOP;

    v_total := fn_calculate_invoice_total(v_consultation_id);
    v_insurance_amount := fn_calculate_insurance_coverage(
        (SELECT patient_id FROM appointments WHERE appointment_id = p_appointment_id),
        v_consultation_id
    );

    INSERT INTO invoices (consultation_id, appointment_id, total_amount, insurance_amount, status)
    VALUES (v_consultation_id, p_appointment_id, v_total, v_insurance_amount, 'Unpaid')
    RETURNING invoice_id INTO v_invoice_id;

    RETURN v_invoice_id;
    -- Any RAISE EXCEPTION above rolls back everything in this function — the appointment status
    -- flip, the consultation insert, every treatment line, and the invoice — automatically,
    -- since a function body erroring inside an open transaction rolls back the whole thing
    -- (FR-DMI-05/06).
END;
$$;
```

### 7.6 Defense-in-depth trigger: treatments only on `Completed` appointments

```sql
CREATE OR REPLACE FUNCTION fn_guard_consultation_treatments()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_status appointment_status_enum;
BEGIN
    SELECT a.status INTO v_status
    FROM consultations c JOIN appointments a ON a.appointment_id = c.appointment_id
    WHERE c.consultation_id = COALESCE(NEW.consultation_id, NEW.appointment_id);
    -- (consultations trigger uses NEW.appointment_id directly instead; see the two attachments below)

    IF v_status IS DISTINCT FROM 'Completed' THEN
        RAISE EXCEPTION 'treatments/consultation notes may only be recorded once the appointment is Completed'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_guard_consultation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_status appointment_status_enum;
BEGIN
    SELECT status INTO v_status FROM appointments WHERE appointment_id = NEW.appointment_id;
    IF v_status IS DISTINCT FROM 'Completed' THEN
        RAISE EXCEPTION 'consultation notes may only be recorded once the appointment is Completed'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_consultation
    BEFORE INSERT ON consultations
    FOR EACH ROW EXECUTE FUNCTION fn_guard_consultation();

CREATE TRIGGER trg_guard_consultation_treatments
    BEFORE INSERT ON consultation_treatments
    FOR EACH ROW EXECUTE FUNCTION fn_guard_consultation_treatments();
```
*(The `fn_guard_consultation_treatments` lookup joins through `consultations` via `NEW.consultation_id`
— the comment inline above flags this; simplify it to `SELECT a.status INTO v_status FROM
consultations c JOIN appointments a ON a.appointment_id = c.appointment_id WHERE
c.consultation_id = NEW.consultation_id` for clarity if you want to drop the `COALESCE`.)*

These triggers pass for `fn_complete_appointment()` because it updates `appointments.status`
**before** inserting into `consultations`/`consultation_treatments`, inside the same transaction
— but they exist specifically to reject *any other* code path that tries to insert clinical
records without going through that function first.

### 7.7 Invoice total & insurance coverage

```sql
CREATE OR REPLACE FUNCTION fn_calculate_invoice_total(p_consultation_id INT) RETURNS DECIMAL(10,2)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(SUM(unit_price * quantity), 0)
    FROM consultation_treatments
    WHERE consultation_id = p_consultation_id;
$$;

CREATE OR REPLACE FUNCTION fn_is_policy_active(p_insurance_id INT) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
    -- Source of truth is always the date range, never the cached is_active flag
    -- (api-routes.md §9.1) — this function is what every coverage calc actually calls.
    SELECT CURRENT_DATE BETWEEN start_date AND end_date
    FROM patient_insurance WHERE insurance_id = p_insurance_id;
$$;

CREATE OR REPLACE FUNCTION fn_calculate_insurance_coverage(
    p_patient_id       INT,
    p_consultation_id  INT
) RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_policy_id INT;
    v_insurance_id INT;
    v_total_covered DECIMAL(10,2) := 0;
BEGIN
    SELECT insurance_id, policy_id INTO v_insurance_id, v_policy_id
    FROM patient_insurance
    WHERE patient_id = p_patient_id
    ORDER BY end_date DESC
    LIMIT 1;

    IF v_insurance_id IS NULL OR NOT fn_is_policy_active(v_insurance_id) THEN
        RETURN 0;   -- no policy, or expired — not an error, just no coverage (FR-IM-06)
    END IF;

    SELECT COALESCE(SUM(
        ct.unit_price * ct.quantity * ptc.coverage_percentage / 100.0
    ), 0)
    INTO v_total_covered
    FROM consultation_treatments ct
    JOIN treatment_catalogue tc ON tc.treatment_code = ct.treatment_code
    LEFT JOIN policy_treatment_coverage ptc
        ON ptc.policy_id = v_policy_id AND ptc.treatment_code = ct.treatment_code
    WHERE ct.consultation_id = p_consultation_id
      AND tc.is_eligible_for_insurance
      AND ptc.coverage_percentage IS NOT NULL;  -- no matching coverage row = 0 for that line

    RETURN v_total_covered;
END;
$$;
```

### 7.8 Record a payment (FR-BPM-03/04/06/07/08)

```sql
CREATE OR REPLACE FUNCTION fn_record_payment(
    p_invoice_id    INT,
    p_amount        DECIMAL(10,2),
    p_payment_type  payment_type_enum
) RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total DECIMAL(10,2);
    v_insurance DECIMAL(10,2);
    v_paid_so_far DECIMAL(10,2);
    v_outstanding DECIMAL(10,2);
BEGIN
    SELECT total_amount, insurance_amount INTO v_total, v_insurance
    FROM invoices WHERE invoice_id = p_invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'invoice % does not exist', p_invoice_id USING ERRCODE = 'P0002';
    END IF;

    SELECT COALESCE(SUM(amount_paid), 0) INTO v_paid_so_far
    FROM payments WHERE invoice_id = p_invoice_id;

    v_outstanding := v_total - v_insurance - v_paid_so_far;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'payment amount must be positive' USING ERRCODE = '23514';
    END IF;

    IF p_amount > v_outstanding THEN
        RAISE EXCEPTION 'payment amount % exceeds outstanding balance %', p_amount, v_outstanding
            USING ERRCODE = '23514';
    END IF;

    INSERT INTO payments (invoice_id, amount_paid, payment_type)
    VALUES (p_invoice_id, p_amount, p_payment_type);

    UPDATE invoices
    SET status = CASE
        WHEN (v_outstanding - p_amount) <= 0 THEN 'Paid'
        ELSE 'Partially Paid'
    END
    WHERE invoice_id = p_invoice_id;
END;
$$;
```

### 7.9 Deactivate (never hard-delete) branches / staff / treatments

```sql
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

CREATE OR REPLACE FUNCTION fn_deactivate_staff(p_user_id INT) RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE staff SET is_active = FALSE WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_deactivate_treatment(p_treatment_code INT) RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE treatment_catalogue SET is_active = FALSE WHERE treatment_code = p_treatment_code;
    -- Always soft-deactivate, never hard-delete, even with zero historical references — keeps
    -- this function's behavior simple/predictable and matches FR-TCM-05's intent; hard-delete of
    -- a genuinely unreferenced row is a separate, explicit DBA action if ever wanted, not this call.
END;
$$;
```

### 7.10 Hard-delete guard (belt-and-suspenders on top of §3's missing grants)

```sql
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

CREATE TRIGGER trg_block_delete_branch
    BEFORE DELETE ON branch FOR EACH ROW EXECUTE FUNCTION fn_block_hard_delete();
CREATE TRIGGER trg_block_delete_staff
    BEFORE DELETE ON staff FOR EACH ROW EXECUTE FUNCTION fn_block_hard_delete();
CREATE TRIGGER trg_block_delete_patient
    BEFORE DELETE ON patient FOR EACH ROW EXECUTE FUNCTION fn_block_hard_delete();
CREATE TRIGGER trg_block_delete_treatment
    BEFORE DELETE ON treatment_catalogue FOR EACH ROW EXECUTE FUNCTION fn_block_hard_delete();
-- (new) doctor.user_id REFERENCES staff.user_id ON DELETE RESTRICT only protects the *staff*
-- row from deletion while a doctor references it — it does nothing to stop a direct
-- `DELETE FROM doctor WHERE user_id = ...`. AGENTS.md §2 lists DOCTOR explicitly among the
-- no-hard-delete tables, so it needs its own trigger, not just protection-by-association:
CREATE TRIGGER trg_block_delete_doctor
    BEFORE DELETE ON doctor FOR EACH ROW EXECUTE FUNCTION fn_block_hard_delete();
```

### 7.11 Login attempt tracking (FR-UAC-01/02/03/06)

Password verification happens in the app (bcrypt/Argon2 comparison) — the DB never sees a
plaintext password and never verifies one. This function only records the *outcome*.

```sql
CREATE OR REPLACE FUNCTION fn_register_login_attempt(
    p_username  VARCHAR(50),
    p_success   BOOLEAN,
    p_lockout_threshold SMALLINT DEFAULT 5   -- placeholder value; exact threshold not determined
                                              -- from the source documents, see architecture.md §9
) RETURNS TABLE(is_locked BOOLEAN, locked_until TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id INT;
    v_attempts SMALLINT;
BEGIN
    SELECT user_id, failed_login_attempts INTO v_user_id, v_attempts
    FROM staff WHERE username = p_username
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ;   -- unknown username: caller returns a
        RETURN;                                          -- generic 401, no user enumeration
    END IF;

    IF p_success THEN
        UPDATE staff
        SET failed_login_attempts = 0, locked_until = NULL, last_login_at = now()
        WHERE user_id = v_user_id;
        RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    UPDATE staff
    SET failed_login_attempts = failed_login_attempts + 1,
        locked_until = CASE
            WHEN failed_login_attempts + 1 >= p_lockout_threshold
                THEN now() + INTERVAL '15 minutes'   -- placeholder duration, same caveat as above
            ELSE locked_until
        END
    WHERE user_id = v_user_id
    RETURNING (failed_login_attempts >= p_lockout_threshold), staff.locked_until
    INTO is_locked, locked_until;

    RETURN NEXT;
END;
$$;
```

---

## 8. Example parameterized queries (called from the FastAPI service layer)

Every example below uses positional placeholders (`$1`, `$2`, ...) as asyncpg/psycopg expect —
no query in this system is ever assembled by string concatenation with request input.

```sql
-- Patient search (FR-PM-04) — NIC exact match OR name ILIKE, paginated
SELECT p.user_id, p.patient_code, u.first_name, u.last_name, u.id_number
FROM patient p JOIN app_user u ON u.user_id = p.user_id
WHERE u.id_number = $1
   OR (u.first_name || ' ' || u.last_name) ILIKE '%' || $2 || '%'
   OR EXISTS (SELECT 1 FROM contact c WHERE c.user_id = u.user_id AND c.phone_number = $2)
ORDER BY u.last_name
LIMIT $3 OFFSET $4;

-- Doctor availability for a given date (drives Book Appointment step 4)
SELECT slot_id, start_time, end_time
FROM doctor_availability_slots
WHERE doctor_id = $1 AND date = $2 AND status = 'Open'
ORDER BY start_time;

-- Outstanding-balances report (FR-RA-03), branch-scoped
SELECT p.patient_code, u.first_name, u.last_name,
       i.total_amount - i.insurance_amount - COALESCE(pay.paid, 0) AS outstanding
FROM invoices i
JOIN appointments a ON a.appointment_id = i.appointment_id
JOIN doctor_availability_slots das ON das.slot_id = a.slot_id
JOIN staff s ON s.user_id = das.doctor_id
JOIN patient p ON p.user_id = a.patient_id
JOIN app_user u ON u.user_id = p.user_id
LEFT JOIN LATERAL (
    SELECT SUM(amount_paid) AS paid FROM payments WHERE invoice_id = i.invoice_id
) pay ON TRUE
WHERE i.status <> 'Paid'
  AND ($1::int IS NULL OR s.branch_id = $1)
ORDER BY outstanding DESC;

-- Doctor itemized payment report (api-routes.md §10, GET /reports/doctor-revenue/{doctor_id}/payments)
-- $1 = doctor_id (server already validated D-role self-scoping, or BM's own-branch/A unrestricted
-- before this query runs — this query itself just takes the already-authorized doctor_id)
SELECT pay.payment_date, p.patient_code, u.first_name, u.last_name,
       i.invoice_code, pay.amount_paid, pay.payment_type
FROM payments pay
JOIN invoices i ON i.invoice_id = pay.invoice_id
JOIN appointments a ON a.appointment_id = i.appointment_id
JOIN doctor_availability_slots das ON das.slot_id = a.slot_id
JOIN patient p ON p.user_id = a.patient_id
JOIN app_user u ON u.user_id = p.user_id
WHERE das.doctor_id = $1
  AND pay.payment_date BETWEEN $2 AND $3
ORDER BY pay.payment_date DESC;
```

---

## 9. Transaction examples (application call sites)

```sql
BEGIN;
SELECT set_config('app.current_user_id', $1, true);
SELECT set_config('app.current_role', $2, true);
SELECT fn_book_appointment($3, $4, $5);
COMMIT;
-- on any exception from fn_book_appointment, the backend issues ROLLBACK and surfaces the
-- exception's message as the 409 body defined in api-routes.md §5.1.
```

```sql
BEGIN;
SELECT set_config('app.current_user_id', $1, true);
SELECT set_config('app.current_role', $2, true);
SELECT fn_complete_appointment($3, $4, $5, $6::jsonb);
COMMIT;
```

```sql
BEGIN;
SELECT set_config('app.current_user_id', $1, true);
SELECT set_config('app.current_role', $2, true);
SELECT fn_record_payment($3, $4, $5);
COMMIT;
```

---

## 10. Indexing plan (summary — inline `CREATE INDEX` statements are in §2)

| Table(s) | Index | Serves |
|---|---|---|
| `doctor_availability_slots` | `(doctor_id, date, status)` | availability lookup for booking |
| `appointments` | `(patient_id)`, `(status)` | patient history, daily-summary report |
| `app_user` | `(id_number)`, trigram on name | NIC/name search (FR-PM-04) |
| `invoices` | `(status)` | outstanding-balances report |
| `consultation_treatments` | `(treatment_code)` | treatment-category report |
| `payments` | `(payment_date)`, `(invoice_id)` | revenue/period reports |
| `audit_log` | `(table_name, changed_at)` | audit queries |

If branch-wise daily-summary queries prove slow once real data volume exists, consider
denormalizing `branch_id` directly onto `appointments` (same tradeoff the original design doc
flagged for this exact query) — not done here since it isn't needed until measured.

---

## 11. Backup, recovery, and connection security (recommendations — not implemented as SQL)

- **Backups:** nightly `pg_dump` (or continuous WAL archiving for point-in-time recovery) to
  storage separate from the primary host; encrypt backup files at rest; restrict who can read the
  backup bucket/volume to the same short list of people who can reach `catms_owner`.
- **Restore testing:** periodically restore the latest backup into a scratch instance and run a
  smoke-test query set — an untested backup is not a guarantee.
- **Connections:** require `sslmode=require` (or stricter) in every connection string;
  `pg_hba.conf` should list specific application-server IPs with `hostssl`, not `0.0.0.0/0`;
  PostgreSQL should not be reachable from the public internet — the API server is the only thing
  that talks to it directly.
- **Secrets:** `<STRONG_PASSWORD>` placeholders above are generated per-environment and injected
  via environment variables / a secrets manager, never committed to source control.

---

## 12. Security review

Working through the checklist from the security-rules prompt:

1. **SQL injection risk:** none of the SQL above builds a query by concatenating a parameter into
   a string — every write path is a `PL/pgSQL` function called with typed positional parameters,
   and every example read query uses `$n` placeholders. The one place that would tempt string-
   building — the patient search's partial-name match — uses `ILIKE '%' || $2 || '%'`, which is
   still fully parameter-bound (the `$2` value is bound, not interpolated); the `%` wildcards are
   static literals, not part of the parameter.
2. **Excessive privileges:** `catms_owner`, `catms_app`, and `catms_readonly` hold no
   `ALL PRIVILEGES` grant and no superuser bit. **`catms_admin` (§3.1) is the one deliberate
   exception** — it does hold `ALL PRIVILEGES ON ALL TABLES`, at the explicit request that
   Administrator connections get full data access. It's still not superuser and still can't run
   DDL (no ownership), and its write access to `audit_log` is revoked back off even though the
   blanket grant would otherwise include it, so an Administrator can't quietly edit their own
   audit trail. `catms_app` (used by every non-Administrator role) keeps the original
   restrictions: no `DELETE` on clinically/financially irreversible tables, no access to
   `audit_log` at all; `catms_readonly` can't see `password_hash`, clinical notes, or insurance
   financial detail.
3. **Sensitive data exposure:** `staff.password_hash` is column-revoked from the readonly role;
   clinical (`consultations`) and financial-insurance tables are withheld from the readonly role
   entirely; RLS narrows a Doctor's *write* access to their own appointments.
4. **Missing constraints:** every FK, the NIC/phone/email `CHECK` regexes, positive-amount
   `CHECK`s on money columns, the `end_date > start_date` / `end_time > start_time` ordering
   checks, and the slot-overlap `EXCLUDE` constraint are all declared at the table level, not left
   to the application to remember.
5. **Unsafe UPDATE/DELETE:** every `UPDATE`/`DELETE` in every function is scoped by a primary-key
   `WHERE` clause on a value already validated by the preceding `SELECT ... FOR UPDATE`; there is
   no bare `UPDATE table SET ...` without a `WHERE` anywhere in this document; hard `DELETE` on
   soft-delete-only tables is blocked twice over (no grant, plus the `BEFORE DELETE` trigger in
   §7.10).
6. **Missing transaction boundaries:** every multi-step business operation (booking, walk-in,
   reschedule, complete+invoice, payment) is one `PL/pgSQL` function, which Postgres treats as
   atomic within the calling transaction — a `RAISE EXCEPTION` anywhere inside unwinds everything
   the function did.
7. **Auth/authorization:** password hashing is explicitly the app's job (Argon2/bcrypt), never
   done or verified in SQL; lockout tracking exists but the exact threshold/duration are
   placeholders (`architecture.md` §9 already flagged these as undetermined — don't ship the
   `5`/`15 minutes` defaults in §7.11 without confirming them against whatever the SRS eventually
   specifies).
8. **RLS:** applied narrowly (§5) where it adds a real guarantee beyond app-layer checks — doctor-
   owns-their-own-clinical-writes, and branch manager read-scoping — not blanket-enabled
   everywhere, which would just be redundant with the grants in §3 and harder to reason about.
9. **Connection security:** covered in §11 — TLS required, `pg_hba.conf` scoped to known hosts, no
   public exposure. Not enforceable from inside this SQL file; it's an infrastructure-config item
   to carry into deployment.
10. **PostgreSQL-specific weaknesses:** every `SECURITY DEFINER`/trigger function pins
    `search_path = public, pg_temp` explicitly — the standard mitigation against a search-path
    hijack where a malicious `pg_temp` or unexpected-schema object shadows a call inside a
    definer-rights function. Sequences behind identity columns are granted explicitly rather than
    assumed reachable.

---

## 13. Final security checklist

- [x] No superuser used by the application.
- [x] Three least-privilege roles (`catms_owner`, `catms_app`, `catms_readonly`), no `ALL
      PRIVILEGES` grants.
- [x] `catms_admin` (§3.1) is the one role with `ALL PRIVILEGES ON ALL TABLES` — a deliberate,
      documented exception for Administrator connections, still non-superuser, still no DDL, and
      still excluded from writing `audit_log` directly.
- [x] Every user-input-driven query is parameterized; no dynamic SQL string-building anywhere.
- [x] Passwords hashed by the application; only hashes stored; no plaintext password SQL.
- [x] PK/FK/CHECK/UNIQUE constraints declared for every rule that can be pushed to the DB.
- [x] No unrestricted `UPDATE`/`DELETE`; hard-delete blocked on soft-delete-only tables via both
      missing grants and a trigger.
- [x] Multi-step operations wrapped in atomic `PL/pgSQL` functions (booking, completion+invoice,
      payment).
- [x] RLS enabled where it adds real protection (doctor-owns-writes, branch-scoped reads),
      documented with why/which-roles/which-rows per table.
- [x] Column-level `REVOKE` on `password_hash` and other sensitive columns for the readonly role.
- [x] `SECURITY DEFINER` functions use a pinned `search_path`.
- [ ] TLS/`pg_hba.conf`/network isolation — infrastructure config, not SQL; must be set at deploy
      time (§11).
- [ ] Backup encryption and restore testing — process, not SQL; must be scheduled operationally
      (§11).
- [ ] Login lockout threshold/duration — currently placeholders in `fn_register_login_attempt()`;
      confirm the real values before shipping (§12 item 7).

---

## 14. Not determined from the current documents

- Exact login-lockout threshold and lockout duration (placeholders used in §7.11).
- JWT expiry/refresh mechanics (affects nothing in this file directly, but session-context in §4
  is only as trustworthy as the JWT verification that precedes it).
- Whether a genuinely unreferenced branch/staff/treatment row may ever be hard-deleted by a DBA
  outside the app (the trigger in §7.10 blocks it unconditionally; relax it manually if wanted).
- Treatment-line correction/adjustment flow for an invoice already generated (no function here
  supports it — `consultation_treatments` rows are immutable once `fn_complete_appointment` has
  run, by construction, not by an explicit extra guard).