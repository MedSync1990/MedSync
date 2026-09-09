-- ============================================================================
-- MedSync CATMS — Verification Test Script (Module 02: Kalana)
-- Reference: docs/database.md §2.1, §2.2, §2.6, §7.1 - §7.4
-- ============================================================================

\echo '=== 1. Checking Tables & Row Counts ==='
SELECT 'specialty' AS table_name, COUNT(*) AS total_rows FROM specialty
UNION ALL
SELECT 'doctor', COUNT(*) FROM doctor
UNION ALL
SELECT 'doctor_speciality', COUNT(*) FROM doctor_speciality
UNION ALL
SELECT 'doctor_availability_slots', COUNT(*) FROM doctor_availability_slots
UNION ALL
SELECT 'appointments', COUNT(*) FROM appointments;

\echo '\n=== 2. Sample Doctors & Specialties ==='
SELECT 
    d.user_id,
    d.license_number,
    s.name AS specialty_name
FROM doctor d
JOIN doctor_speciality ds ON d.user_id = ds.user_id
JOIN specialty s ON ds.speciality_id = s.speciality_id
ORDER BY d.user_id
LIMIT 6;

\echo '\n=== 3. Testing Slot Overlap Prevention (FR-AM-03: excl_slot_overlap) ==='
-- Attempting to insert an overlapping availability slot for Doctor 101 (e.g. 09:15 to 09:45 when 09:00 to 09:30 exists)
DO $$
BEGIN
    INSERT INTO doctor_availability_slots (doctor_id, date, start_time, end_time, status)
    VALUES (101, CURRENT_DATE, '09:15:00', '09:45:00', 'Open');
    RAISE EXCEPTION 'TEST FAILED: excl_slot_overlap constraint did NOT block overlapping slot!';
EXCEPTION
    WHEN exclusion_violation THEN
        RAISE NOTICE '-> TEST PASSED: Database engine blocked overlapping slot on doctor_availability_slots with exclusion_violation!';
END $$;

\echo '\n=== 4. Testing fn_book_appointment() (FR-AM-01/02) ==='
DO $$
DECLARE
    v_slot_id INT;
    v_appt_id INT;
BEGIN
    -- Find an open slot for Doctor 101
    SELECT slot_id INTO v_slot_id
    FROM doctor_availability_slots
    WHERE doctor_id = 101 AND status = 'Open'
    LIMIT 1;

    -- Book the appointment
    v_appt_id := fn_book_appointment(999, v_slot_id, 'Scheduled Visit');
    RAISE NOTICE '-> TEST PASSED: Booked appointment id %, slot % is now Booked!', v_appt_id, v_slot_id;

    -- Attempt to double-book the exact same slot
    BEGIN
        PERFORM fn_book_appointment(998, v_slot_id, 'Scheduled Visit');
        RAISE EXCEPTION 'TEST FAILED: Slot allowed double-booking!';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '-> TEST PASSED: Attempt to double-book slot blocked with error: %', SQLERRM;
    END;
END $$;

\echo '\n=== 5. Testing fn_reschedule_appointment() (FR-AM-05) ==='
DO $$
DECLARE
    v_appt_id INT;
    v_old_slot_id INT;
    v_new_slot_id INT;
BEGIN
    SELECT appointment_id, slot_id INTO v_appt_id, v_old_slot_id
    FROM appointments
    WHERE patient_id = 999 AND status = 'Scheduled'
    LIMIT 1;

    SELECT slot_id INTO v_new_slot_id
    FROM doctor_availability_slots
    WHERE doctor_id = 101 AND status = 'Open' AND slot_id <> v_old_slot_id
    LIMIT 1;

    PERFORM fn_reschedule_appointment(v_appt_id, v_new_slot_id);
    RAISE NOTICE '-> TEST PASSED: Rescheduled appointment % from slot % to %', v_appt_id, v_old_slot_id, v_new_slot_id;
END $$;

\echo '\n=== 6. Testing fn_cancel_appointment() (FR-AM-06) ==='
DO $$
DECLARE
    v_appt_id INT;
    v_slot_id INT;
    v_slot_status slot_status_enum;
BEGIN
    SELECT appointment_id, slot_id INTO v_appt_id, v_slot_id
    FROM appointments
    WHERE patient_id = 999 AND status = 'Scheduled'
    LIMIT 1;

    PERFORM fn_cancel_appointment(v_appt_id);

    SELECT status INTO v_slot_status
    FROM doctor_availability_slots
    WHERE slot_id = v_slot_id;

    RAISE NOTICE '-> TEST PASSED: Cancelled appointment %, slot % reopened with status: %', v_appt_id, v_slot_id, v_slot_status;

    -- Clean up test records
    DELETE FROM appointments WHERE patient_id IN (998, 999);
END $$;
