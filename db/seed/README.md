# MedSync Database Seed Assumptions

This directory contains seed data scripts for initializing the MedSync shared PostgreSQL database.

## Billing & Insurance Module (Shavinda)

- **Providers & Policies (`04_billing_insurance_seed.sql`):**
  - Provider 1: **Ceylinco Life** — *Gold Health Shield* (80% coverage on consultations, 75% on lab tests).
  - Provider 2: **Softlogic Life** — *Executive Healthcare* (100% coverage on consultations, 90% on lab tests, 85% on imaging).
  - Provider 3: **AIA Insurance** — *Comprehensive Care Plus* (70% coverage on consultations, 60% on imaging).
- **Payment Types:** `Cash`, `Card`, `Insurance Settlement`.
