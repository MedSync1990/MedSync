# MedSync Self-Test Seeds

These files provide small, repeatable test data for every operational table. Run the complete set from the repository root after applying `db/schema.sql`:

```sh
psql "$DATABASE_URL" -f db/seed/self_test/run_all.sql
```

The default staff password is `MedSync@2026`.

Each file targets one table and uses stable natural keys where the schema provides them. The files are ordered by foreign-key dependencies; run `run_all.sql` rather than individual files when possible.
