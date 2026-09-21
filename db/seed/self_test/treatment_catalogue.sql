INSERT INTO treatment_catalogue (treatment_name, category, price, is_eligible_for_insurance)
SELECT v.treatment_name, v.category, v.price, v.is_eligible_for_insurance
FROM (VALUES
    ('Self-Test Consultation', 'Consultation', 2500.00::decimal, TRUE),
    ('Self-Test Blood Test', 'Laboratory', 1800.00::decimal, TRUE),
    ('Self-Test X-Ray', 'Imaging', 4500.00::decimal, TRUE),
    ('Self-Test Dressing', 'Procedure', 900.00::decimal, FALSE),
    ('Self-Test ECG', 'Diagnostics', 3200.00::decimal, TRUE),
    ('Self-Test Follow-up', 'Consultation', 1500.00::decimal, FALSE)
) AS v(treatment_name, category, price, is_eligible_for_insurance)
WHERE NOT EXISTS (
    SELECT 1 FROM treatment_catalogue t WHERE t.treatment_name = v.treatment_name
);
