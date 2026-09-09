-- db/modules/04_billing_insurance.sql
-- Module: Billing & Insurance
-- Author: Shavinda
-- Entry point script concatenating all sub-module files in FK-safe execution order

\i db/modules/shavinda/insurance_policy_details.sql
\i db/modules/shavinda/patient_insurance.sql
\i db/modules/shavinda/policy_treatment_coverage.sql
\i db/modules/shavinda/invoices.sql
\i db/modules/shavinda/payments.sql
\i db/modules/shavinda/function_record_payment.sql
\i db/modules/shavinda/function_calculate_invoice_total.sql
\i db/modules/shavinda/function_is_policy_active.sql
\i db/modules/shavinda/function_calculate_insurance_coverage.sql

