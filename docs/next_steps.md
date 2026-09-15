# MedSync — Next Steps & Outstanding Tasks

> Last updated: 2026-09-15

---

## 📋 Current Status

All SQL files have been written by each team member. The database layer is **complete in terms of structure** but has some audit gaps and is not yet migrated or connected to the backend.

---

## ⚠️ Missing Audit Triggers (Ashen's Task)

The following tables exist but have **no audit trigger** attached. These need to be added to
`db/modules/ashen/05_audit_and_rls.sql`.

| Priority | Table | Reason |
|----------|-------|--------|
| 🔴 High | `app_user` | Login/auth changes are a security-critical event |
| 🔴 High | `patient` | Patient record edits must be traceable |
| 🔴 High | `consultations` | Clinical records require a full change trail |
| 🔴 High | `admission` | Hospital admission is high-stakes data |
| 🟡 Medium | `patient_insurance` | Insurance changes affect billing accuracy |
| 🟡 Medium | `doctor` | Doctor profile changes should be logged |
| 🟢 Low | `consultation_treatments` | Optional but good to have |
| 🟢 Low | `contact` | Optional |
| 🟢 Low | `doctor_availability_slots` | Optional |
| 🟢 Low | `insurance_policy_details` | Optional |

### Template to follow (already used in `05_audit_and_rls.sql`):

```sql
CREATE TRIGGER trg_audit_<table_name>
    AFTER INSERT OR UPDATE OR DELETE ON <table_name>
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('<primary_key_column>');
```

#### Examples for missing tables:

```sql
-- app_user (primary key: user_id)
CREATE TRIGGER trg_audit_app_user
    AFTER INSERT OR UPDATE OR DELETE ON app_user
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('user_id');

-- patient (primary key: patient_id)
CREATE TRIGGER trg_audit_patient
    AFTER INSERT OR UPDATE OR DELETE ON patient
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('patient_id');

-- consultations (primary key: consultation_id)
CREATE TRIGGER trg_audit_consultations
    AFTER INSERT OR UPDATE OR DELETE ON consultations
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('consultation_id');

-- admission (primary key: admission_id)
CREATE TRIGGER trg_audit_admission
    AFTER INSERT OR UPDATE OR DELETE ON admission
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('admission_id');

-- patient_insurance (primary key: patient_insurance_id)
CREATE TRIGGER trg_audit_patient_insurance
    AFTER INSERT OR UPDATE OR DELETE ON patient_insurance
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('patient_insurance_id');
```

---

## 🚀 Next Steps (In Order)

### Step 1 — Fix Missing Audit Triggers *(Ashen)*

- Add the missing triggers listed above to `db/modules/ashen/05_audit_and_rls.sql`
- Prioritise at minimum: `app_user`, `patient`, `consultations`, `admission`

---

### Step 2 — Run the Migration *(All / Dilantha leads)*

Execute all SQL files against the PostgreSQL database in the correct dependency order.

The project has a `backend/migrate.py` script. Review it and confirm the execution order is:

```
1. dilantha/  → roles, branch, app_user, contact, staff, pg_roles
2. kalana/    → specialty, doctor, doctor_speciality, doctor_availability_slots, appointments
3. chenith/   → allergy, patient, patient_allergy, treatment_catalogue,
                consultations, consultation_treatments, admission
4. shavinda/  → insurance_policy_details, patient_insurance, invoices,
                payments, policy_treatment_coverage
5. ashen/     → audit_log, fn_audit_trigger, RLS policies, audit triggers
6. kalana/    → stored functions (fn_book_appointment, fn_reschedule, etc.)
7. shavinda/  → stored functions (fn_record_payment, fn_is_policy_active, etc.)
8. chenith/   → fn_deactivate_treatment, consultation_guards
9. dilantha/  → protection_functions, auth_functions
```

**Command to run:**

```bash
cd backend
python migrate.py
```

---

### Step 3 — Test the Database *(Each member tests their own module)*

Each person should verify their tables, functions, and triggers work correctly.

| Member | What to test |
|--------|-------------|
| Dilantha | Login functions, branch/staff protection triggers, role-based access |
| Kalana | `fn_book_appointment`, `fn_reschedule`, `fn_cancel_appointment`, `fn_create_walk_in`, `trg_block_delete_doctor` |
| Chenith | `fn_deactivate_treatment`, consultation guards, patient/allergy linkage |
| Shavinda | `fn_record_payment`, `fn_is_policy_active`, `fn_calculate_insurance_coverage`, invoice flow |
| Ashen | Audit log entries appear after INSERT/UPDATE/DELETE, RLS policies enforce branch isolation |

Reference: `db/test_kalana.py` shows a working test pattern to follow.

---

### Step 4 — Build the Backend API *(All members)*

The `backend/app/` folder currently only has `main.py`, `config.py`, `database.py`.
Each member must build API routes for their module.

#### Structure to follow:

```
backend/app/
├── routers/
│   ├── auth.py          ← Dilantha
│   ├── appointments.py  ← Kalana
│   ├── patients.py      ← Chenith
│   └── billing.py       ← Shavinda
├── schemas/
│   ├── auth.py
│   ├── appointments.py
│   ├── patients.py
│   └── billing.py
├── services/
│   ├── auth.py
│   ├── appointments.py
│   ├── patients.py
│   └── billing.py
├── config.py
├── database.py
└── main.py
```

#### Each router should expose at minimum:

**Dilantha (Auth / Branch / Staff):**
- `POST /api/auth/login`
- `POST /api/staff/deactivate`
- `POST /api/branch/deactivate`

**Kalana (Appointments / Doctors):**
- `POST /api/appointments/book`
- `POST /api/appointments/walk-in`
- `PUT  /api/appointments/reschedule`
- `DELETE /api/appointments/cancel`
- `GET  /api/doctors`
- `GET  /api/doctors/{id}/slots`

**Chenith (Patients / Consultations):**
- `POST /api/patients`
- `GET  /api/patients/{id}`
- `POST /api/consultations`
- `POST /api/consultations/{id}/treatments`
- `POST /api/admissions`

**Shavinda (Billing / Insurance):**
- `POST /api/invoices`
- `POST /api/payments`
- `GET  /api/invoices/{id}`
- `GET  /api/patients/{id}/insurance`

---

### Step 5 — Connect Frontend to Backend *(All / Frontend lead)*

- Wire the `frontend/` UI to the API endpoints from Step 4
- Use environment variables for the API base URL
- Handle auth tokens from the login endpoint

---

### Step 6 — End-to-End Testing *(All members)*

Test the full flow from frontend → API → database for each feature:

- [ ] Staff login → JWT issued
- [ ] Book appointment → slot blocked, audit log entry created
- [ ] Patient created → consultation recorded → invoice generated → payment processed
- [ ] RLS: staff in Branch A cannot see Branch B records
- [ ] Audit log shows who changed what and when

---

## 📁 Reference Files

| File | Description |
|------|-------------|
| `db/modules/ashen/05_audit_and_rls.sql` | Audit triggers & RLS (add missing triggers here) |
| `backend/migrate.py` | Migration script to run all SQL files |
| `db/test_kalana.py` | Example test script to follow |
| `backend/app/main.py` | FastAPI entry point |
| `backend/app/database.py` | DB connection setup |
