-- ============================================================================
-- Table: doctor_weekly_schedule
-- Role: Stores doctor recurring weekly schedule / shift templates
-- Owner: Kalana Jayawardena
-- ============================================================================

CREATE TABLE IF NOT EXISTS doctor_weekly_schedule (
    schedule_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doctor_id      INT NOT NULL REFERENCES doctor(user_id) ON DELETE CASCADE,
    day_of_week    INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 1=Mon, ..., 6=Sat
    start_time     TIME NOT NULL,
    end_time       TIME NOT NULL CHECK (end_time > start_time),
    slot_duration  INT NOT NULL DEFAULT 30, -- minutes per consult
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_doctor_day_shift UNIQUE (doctor_id, day_of_week, start_time)
);

CREATE INDEX IF NOT EXISTS idx_doc_weekly_schedule 
    ON doctor_weekly_schedule(doctor_id, day_of_week, is_active);

-- ============================================================================
-- Trigger: trg_doctor_default_schedule
-- Description: Automatically generates default Mon-Fri working roster
--              whenever a new doctor is registered.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_create_default_doctor_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Mon-Fri (1-5), Morning (09:00 - 12:00) & Afternoon (14:00 - 16:30)
    INSERT INTO doctor_weekly_schedule (doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)
    SELECT
        NEW.user_id,
        d.day_of_week,
        s.start_time,
        s.end_time,
        30,
        TRUE
    FROM (VALUES (1), (2), (3), (4), (5)) AS d(day_of_week)
    CROSS JOIN (
        VALUES 
            ('09:00:00'::time, '12:00:00'::time),
            ('14:00:00'::time, '16:30:00'::time)
    ) AS s(start_time, end_time)
    ON CONFLICT (doctor_id, day_of_week, start_time) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_doctor_default_schedule ON doctor;
CREATE TRIGGER trg_doctor_default_schedule
AFTER INSERT ON doctor
FOR EACH ROW
EXECUTE FUNCTION fn_create_default_doctor_schedule();

-- Backfill default schedule for existing doctors if not already present
INSERT INTO doctor_weekly_schedule (doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)
SELECT
    d.user_id,
    days.day_of_week,
    shifts.start_time,
    shifts.end_time,
    30,
    TRUE
FROM doctor d
CROSS JOIN (VALUES (1), (2), (3), (4), (5)) AS days(day_of_week)
CROSS JOIN (
    VALUES 
        ('09:00:00'::time, '12:00:00'::time),
        ('14:00:00'::time, '16:30:00'::time)
) AS shifts(start_time, end_time)
ON CONFLICT (doctor_id, day_of_week, start_time) DO NOTHING;

-- ============================================================================
-- Function: fn_generate_slots_from_roster
-- Description: Generates rolling concrete slots in doctor_availability_slots
--              from each doctor's weekly roster for active doctors.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_generate_slots_from_roster(p_days_ahead INT DEFAULT 14)
RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_inserted INT := 0;
BEGIN
    WITH dynamic_slots AS (
        SELECT 
            dws.doctor_id,
            day_offset.day::date AS date,
            slot_chunk.slot_start::time AS start_time,
            (slot_chunk.slot_start + (dws.slot_duration || ' minutes')::interval)::time AS end_time,
            'Open'::slot_status_enum AS status
        FROM doctor_weekly_schedule dws
        JOIN staff s ON s.user_id = dws.doctor_id AND s.is_active = TRUE
        CROSS JOIN (
            SELECT (CURRENT_DATE + s * INTERVAL '1 day')::date AS day
            FROM generate_series(0, p_days_ahead) AS s
        ) AS day_offset
        CROSS JOIN LATERAL (
            SELECT t::time AS slot_start
            FROM generate_series(
                (day_offset.day + dws.start_time)::timestamp,
                (day_offset.day + dws.end_time - (dws.slot_duration || ' minutes')::interval)::timestamp,
                (dws.slot_duration || ' minutes')::interval
            ) AS t
        ) AS slot_chunk
        WHERE dws.is_active = TRUE
          AND EXTRACT(DOW FROM day_offset.day)::int = dws.day_of_week
    )
    INSERT INTO doctor_availability_slots (doctor_id, date, start_time, end_time, status)
    SELECT ds.doctor_id, ds.date, ds.start_time, ds.end_time, ds.status
    FROM dynamic_slots ds
    WHERE NOT EXISTS (
        SELECT 1 FROM doctor_availability_slots existing
        WHERE existing.doctor_id = ds.doctor_id
          AND existing.date = ds.date
          AND tsrange(existing.date + existing.start_time, existing.date + existing.end_time, '[)') && 
              tsrange(ds.date + ds.start_time, ds.date + ds.end_time, '[)')
    )
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    RETURN v_inserted;
END;
$$;
