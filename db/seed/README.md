# MedSync Seed Data

Apply the schema first, then run the complete seed set from the repository root:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/seed/seed_data.sql
```

Each table has its own seed file. The files are ordered by foreign-key dependency and use stable natural keys or `NOT EXISTS` guards so the seed can be rerun. Generated identity and generated code columns are intentionally omitted.

The seed includes at least 10 branches, doctors, patients, specialties, allergies, treatments, slots, appointments, consultations, insurance policies, invoices, and related workflow rows.
