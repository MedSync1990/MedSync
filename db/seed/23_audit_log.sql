INSERT INTO audit_log (table_name, operation, row_pk, changed_by, new_data)
SELECT 'seed_validation', 'INSERT', 'SEED-' || lpad(n::text, 3, '0'), 'seed_runner',
       jsonb_build_object('fixture_number', n, 'purpose', 'database module validation')
FROM generate_series(1, 10) AS n
WHERE NOT EXISTS (
    SELECT 1 FROM audit_log existing
    WHERE existing.table_name = 'seed_validation'
      AND existing.row_pk = 'SEED-' || lpad(n::text, 3, '0')
);
