DO $$
DECLARE
    v_appointment_id INT;
BEGIN
    FOR v_appointment_id IN
        SELECT a.appointment_id
        FROM appointments a
        WHERE a.status = 'Completed'
          AND NOT EXISTS (
              SELECT 1
              FROM consultations c
              WHERE c.appointment_id = a.appointment_id
          )
    LOOP
        INSERT INTO consultations (
            appointment_id, diagnosis, consultation_notes
        )
        VALUES (
            v_appointment_id,
            'Routine follow-up assessment',
            'Seed consultation record for development and testing.'
        );
    END LOOP;
END;
$$;