\i db/modules/chenith/patient.sql
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'fk_appt_patient'
	) THEN
		ALTER TABLE appointments
			ADD CONSTRAINT fk_appt_patient
			FOREIGN KEY (patient_id) REFERENCES patient(user_id)
			ON DELETE RESTRICT;
	END IF;
END $$;
\i db/modules/chenith/allergy.sql
\i db/modules/chenith/patient_allergy.sql
\i db/modules/chenith/admission.sql
\i db/modules/chenith/treatment_catalogue.sql
\i db/modules/chenith/consultations.sql
\i db/modules/chenith/consultation_treatments.sql
\i db/modules/chenith/consultation_guards.sql
\i db/modules/chenith/fn_complete_appointment.sql
\i db/modules/chenith/fn_deactivate_treatment.sql
