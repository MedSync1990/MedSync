WITH numbered_doctors AS (
    SELECT d.user_id,
           row_number() OVER (ORDER BY u.email) AS sequence
    FROM doctor d
    JOIN app_user u ON u.user_id = d.user_id
    WHERE u.email LIKE 'doctor%@medsync.test'
)
INSERT INTO doctor_speciality (user_id, speciality_id)
SELECT d.user_id, sp.speciality_id
FROM numbered_doctors d
JOIN specialty sp ON sp.name = CASE ((d.sequence - 1) % 10)
    WHEN 0 THEN 'General Medicine' WHEN 1 THEN 'Cardiology' WHEN 2 THEN 'Pediatrics'
    WHEN 3 THEN 'Dermatology' WHEN 4 THEN 'Orthopedics' WHEN 5 THEN 'Neurology'
    WHEN 6 THEN 'Gynecology' WHEN 7 THEN 'ENT' WHEN 8 THEN 'Ophthalmology'
    ELSE 'Radiology' END
ON CONFLICT (user_id, speciality_id) DO NOTHING;
