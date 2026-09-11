-- MedSync CATMS - Patient Management and Consultation/Treatment seed data
-- Run after the identity/branch seed and before consultation-dependent billing seed.

\ir app_user.sql
\ir patient.sql
\ir contact.sql
\ir allergy.sql
\ir patient_allergy.sql
\ir admission.sql
\ir treatment_catalogue.sql
\ir consultations.sql
\ir consultation_treatments.sql