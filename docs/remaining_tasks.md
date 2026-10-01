# MedSync — Remaining Tasks & Open Items
> **Based on current project status, `architecture.md`, and `api-routes.md`**

This document outlines the remaining features, architectural decisions, and integration tasks required to bring MedSync to a production-ready state. It also explains *why* each of these tasks is essential.

## 1. Security & Infrastructure Completeness

### 1.1 Database Audit Triggers
**What is left:** Add SQL audit triggers to security-critical tables (`app_user`, `patient`, `consultations`, `admission`).
**Why it is required:** A healthcare system must maintain strict traceability (HIPAA/compliance standard). If a patient record or clinical consultation is altered, the system must definitively log *who* changed it and *when*. Without these triggers, the system has critical security and auditing blind spots.

### 1.2 Row-Level Security (RLS) & Branch Isolation
**What is left:** Fully implement and test RLS policies and RBAC middleware to strictly enforce branch scoping.
**Why it is required:** MedSync operates across multiple branches (Colombo, Kandy, Galle). A Branch Manager in Galle should not have access to financial or clinical data from Colombo. RLS ensures that even if the API logic fails, the database inherently blocks cross-branch data leaks.

### 1.3 Hardened Authentication & API Protection
**What is left:** Finalize password hashing algorithms, JWT token expiry/refresh mechanics, login-lockout thresholds, CSRF protection, and API rate-limiting.
**Why it is required:** To meet the 100-concurrent-user Non-Functional Requirement (NFR) securely. Rate limiting prevents Denial of Service (DoS) attacks, lockout mechanisms stop brute-force password guessing, and robust JWT lifecycles prevent session hijacking.

## 2. Cross-Module Integration & E2E Testing (Phase 3)

### 2.1 Complete Frontend-to-Backend Wiring
**What is left:** Connect all isolated UI pages directly to their respective backend endpoints, managing global states (like JWTs) and rendering dynamic validation errors (`400`, `401`, `403`, `409`, `422`).
**Why it is required:** The individual APIs and UIs are useless until they can speak to each other. Proper error handling ensures that if a user tries to book an overlapping appointment, the UI gracefully explains the issue rather than crashing.

### 2.2 End-to-End Workflow Testing
**What is left:** Execute and validate full user journeys across module boundaries (e.g., Kalana's Appointment → Chenith's Consultation → Shavinda's Billing). 
**Why it is required:** Integration is where the most critical bugs hide. For example, ensuring that completing a consultation correctly triggers the invoice generation logic without violating database constraints (like the zero-balance bug we recently resolved).

## 3. Unresolved Architectural & Business Edge Cases

### 3.1 Invoice & Billing Adjustments
**What is left:** Design a workflow for correcting a treatment line on an invoice *after* the invoice has already been generated.
**Why it is required:** Real-world clinics make mistakes. If a doctor accidentally adds the wrong treatment code, the receptionist needs a secure, audited way to adjust the invoice without breaking the financial reporting ledger.

### 3.2 Hard vs. Soft Deletes
**What is left:** Decide definitively if hard-deleting a record is *ever* allowed (e.g., for empty, unused records), or if the system strictly enforces soft-deletes forever.
**Why it is required:** Prevents orphaned records (e.g., an invoice pointing to a deleted patient). Establishing a uniform soft-delete strategy ensures historical integrity across all reports.

### 3.3 Missing Endpoints & Audit UI
**What is left:** Implement missing endpoints (e.g., `POST /patients/{id}/insurance` to register new policies) and design a `GET /audit-log` endpoint/UI for administrators.
**Why it is required:** Core business requirements cannot be fulfilled if the data cannot be inputted (insurance). Furthermore, capturing audit logs is useless if administrators don't have a UI to read and investigate them.

## 4. Production Deployment & CI/CD

### 4.1 Deployment Architecture
**What is left:** Define the final hosting provider, domains, CI/CD pipelines, server health checks, and database scaling configurations.
**Why it is required:** The system currently runs locally via Docker Compose. To be accessible to the actual clinics in Colombo, Kandy, and Galle, it requires a secure, highly-available cloud environment with automated deployment pipelines to safely push future updates.
