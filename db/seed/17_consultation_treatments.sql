WITH numbered_consultations AS (
    SELECT c.consultation_id,
           row_number() OVER (ORDER BY c.consultation_id) AS sequence
    FROM consultations c
)
INSERT INTO consultation_treatments (consultation_id, treatment_code, quantity, unit_price)
SELECT c.consultation_id, t.treatment_code,
       1 + ((c.sequence - 1) % 2),
       t.price
FROM numbered_consultations c
JOIN treatment_catalogue t ON t.treatment_name = CASE ((c.sequence - 1) % 10)
    WHEN 0 THEN 'General Consultation' WHEN 1 THEN 'Blood Test' WHEN 2 THEN 'Urine Test'
    WHEN 3 THEN 'Chest X-Ray' WHEN 4 THEN 'ECG' WHEN 5 THEN 'Ultrasound'
    WHEN 6 THEN 'Physiotherapy Session' WHEN 7 THEN 'Minor Wound Dressing'
    WHEN 8 THEN 'Vaccination' ELSE 'Health Screening' END
ON CONFLICT (consultation_id, treatment_code) DO NOTHING;
