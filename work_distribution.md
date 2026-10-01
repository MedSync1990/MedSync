# MedSync - Team Work Distribution

This document outlines the division of work for the MedSync project across the team. 

## 👨‍💻 Team Members
* **Shavinda**
* **Chenith**
* **Kalana**
* **Dilantha**
* **Ashen**

---

## 📋 Task Allocation

### 1. Shavinda
**Role:** Project Management & Backend Architecture
* **Tasks:**
  * Oversee project timeline and repository management.
  * Define backend architecture and core configuration (`config.py`, `main.py`).
  * Implement security features and role-based access control (RBAC).
  * Handle deployment configuration (Docker, environments).

### 2. Chenith
**Role:** Frontend UI/UX Development
* **Tasks:**
  * Develop and maintain the UI generator for the Healthcare System.
  * Implement Receptionist Dashboard (Patient Registration, Appointments, Billing).
  * Implement Branch Manager & Admin interfaces.
  * Ensure responsive design and Tailwind CSS styling consistency.

### 3. Kalana
**Role:** Backend API Development
* **Tasks:**
  * Develop RESTful API endpoints using FastAPI (`routers/`).
  * Implement complex report generation endpoints (Appointments summary, Revenue, Outstanding balances).
  * Handle business logic for appointments, invoices, and treatments.

### 4. Dilantha
**Role:** Database Management & Integration
* **Tasks:**
  * Design and optimize the database schema (Tables for Patients, Doctors, Appointments, Invoices, etc.).
  * Handle `asyncpg` connection pooling and raw SQL queries (`db.py`).
  * Write database migrations and seed data scripts (`scratch_db.py`, `test_db.py`).
  * Ensure data integrity and optimize complex join queries.

### 5. Ashen
**Role:** Quality Assurance (QA) & Documentation
* **Tasks:**
  * Write unit and integration tests (`tests/`, `smoke_test.py`).
  * Perform manual testing of API endpoints and UI workflows.
  * Maintain system documentation, READMEs, and API specifications.
  * Handle bug tracking and issue resolution verification.

---

> **Note:** This is a living document. Task allocations may shift depending on project requirements and bottlenecks. Please keep this file updated as responsibilities evolve.
