-- =============================================================================
-- MedSync CATMS — Standalone Doctor Availability Slot Generator
-- =============================================================================
-- Purpose: Generates doctor availability slots for initial seeding and ongoing
--          testing/operations.
--
-- Features:
--   1. Seeds baseline appointment slots (IDs 1-13) used for initial test
--      appointments if they do not already exist.
--   2. Dynamically generates 30-minute open availability slots for all active
--      doctors across a 14-day rolling window (morning & afternoon shifts).
--   3. Idempotent & Safe:
--      - Uses ON CONFLICT (slot_id) DO NOTHING for baseline demo slots.
--      - Uses tsrange exclusion check to skip any time slots that already exist
--        or overlap for that doctor.
--      - Can be run over and over again without duplicate key errors, overlap
--        violations, or disturbing existing booked appointments.
--
-- Usage:
--   - Standalone:  psql -d medsync -f db/generate_slots.sql
--   - In Seed:     \ir generate_slots.sql
-- =============================================================================

-- 1. Baseline demo slots (1-13) required for initial appointment booking tests
INSERT INTO doctor_availability_slots
    (slot_id, doctor_id, date, start_time, end_time, status)
OVERRIDING SYSTEM VALUE VALUES
    -- Doctor 1 (Colombo) — 3 slots
    (1,  6, CURRENT_DATE,                 '09:00', '09:30', 'Open'),
    (2,  6, CURRENT_DATE,                 '10:00', '10:30', 'Open'),
    (3,  6, CURRENT_DATE,                 '11:00', '11:30', 'Open'),
    (4,  6, CURRENT_DATE + 1,             '09:00', '09:30', 'Open'),
    -- Doctor 2 (Colombo) — 2 slots
    (5,  7, CURRENT_DATE,                 '14:00', '14:30', 'Open'),
    (6,  7, CURRENT_DATE + 1,             '15:00', '15:30', 'Open'),
    -- Doctor 3 (Kandy) — 3 slots
    (7,  8, CURRENT_DATE,                 '08:30', '09:00', 'Open'),
    (8,  8, CURRENT_DATE,                 '09:30', '10:00', 'Open'),
    (9,  8, CURRENT_DATE + 2,             '10:00', '10:30', 'Open'),
    -- Doctor 4 (Kandy) — 2 slots
    (10, 9, CURRENT_DATE,                 '13:00', '13:30', 'Open'),
    (11, 9, CURRENT_DATE + 1,             '14:00', '14:30', 'Open'),
    -- Doctor 5 (Galle) — 2 slots
    (12, 10, CURRENT_DATE,                '11:00', '11:30', 'Open'),
    (13, 10, CURRENT_DATE + 3,            '09:00', '09:30', 'Open')
ON CONFLICT (slot_id) DO NOTHING;

-- Reset sequence past baseline slots before dynamic insertion
SELECT setval(
    'doctor_availability_slots_slot_id_seq',
    COALESCE((SELECT MAX(slot_id) FROM doctor_availability_slots), 1)
);

-- 2. Rolling 14-day availability slots for all active doctors
INSERT INTO doctor_availability_slots (doctor_id, date, start_time, end_time, status)
SELECT 
    d.user_id,
    day_offset.day::date,
    slot_times.start_time,
    slot_times.end_time,
    'Open'::slot_status_enum
FROM doctor d
JOIN staff s ON s.user_id = d.user_id AND s.is_active = TRUE
CROSS JOIN (
    SELECT (CURRENT_DATE + s * INTERVAL '1 day')::date AS day
    FROM generate_series(0, 14) AS s
) AS day_offset
CROSS JOIN (
    VALUES 
        -- Morning shift: 09:00 to 12:00
        ('09:00:00'::time, '09:30:00'::time),
        ('09:30:00'::time, '10:00:00'::time),
        ('10:00:00'::time, '10:30:00'::time),
        ('10:30:00'::time, '11:00:00'::time),
        ('11:00:00'::time, '11:30:00'::time),
        ('11:30:00'::time, '12:00:00'::time),
        -- Afternoon shift: 14:00 to 16:30
        ('14:00:00'::time, '14:30:00'::time),
        ('14:30:00'::time, '15:00:00'::time),
        ('15:00:00'::time, '15:30:00'::time),
        ('15:30:00'::time, '16:00:00'::time),
        ('16:00:00'::time, '16:30:00'::time)
) AS slot_times(start_time, end_time)
WHERE NOT EXISTS (
    SELECT 1 FROM doctor_availability_slots existing
    WHERE existing.doctor_id = d.user_id
      AND existing.date = day_offset.day
      AND tsrange(existing.date + existing.start_time, existing.date + existing.end_time, '[)') && 
          tsrange(day_offset.day + slot_times.start_time, day_offset.day + slot_times.end_time, '[)')
);

-- 3. Reset sequence to highest generated slot_id
SELECT setval(
    'doctor_availability_slots_slot_id_seq',
    COALESCE((SELECT MAX(slot_id) FROM doctor_availability_slots), 1)
);
