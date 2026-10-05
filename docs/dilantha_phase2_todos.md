# MedSync Phase 2: Outstanding Tasks and UI Standardization

This document provides a deep analysis of the current codebase state, highlighting what is left to do across the project, with a specific focus on Dilantha's remaining responsibilities regarding the backend authentication and frontend UI shell.

## 1. Dilantha's Outstanding Tasks (What is left to do)

As the owner of Auth & Branch/Staff Management, your core routing, RBAC, and middleware logic (`auth.py`, `branches.py`, `staff.py`, `dependencies.py`) are largely complete and functional. However, the following items are left to do:

### Backend & Authentication
*   **Finalize Lockout Threshold:** In `backend/app/routers/auth.py`, the `LOCKOUT_THRESHOLD` is currently hardcoded to `5` with a comment marking it as a placeholder (`# placeholder per database.md §14 -- confirm before shipping`). You need to confirm the actual threshold and lockout duration requirements from the product/database specs and finalize this logic.
*   **Optional Server-Side Revocation:** The `POST /auth/logout` route is currently stateless and relies purely on clearing the client-side cookies. If strict session invalidation is required, you may need to implement a token blocklist table in the database to catch tokens that haven't expired yet.

### Frontend UI Shell & Layout Standardization (Crucial)
You are the owner of the main application shell (`AuthenticatedLayout.tsx`, `Sidebar.tsx`, `TopBar.tsx`). The provided UI HTML mockups (`stitch_enterprise_healthcare_ui_generator`) contain several severe inconsistencies. **It is your responsibility to standardize these globally** so that when the rest of the team plugs their pages into your layout, the app looks unified. 

Here is what you need to fix for the UI:
*   **Enforce Global Typography:** The `Roboto` font is inconsistently applied in the mockups (only present in 7 out of 24 files). You need to define `Roboto` as the global default sans-serif font in `frontend/src/index.css` or Tailwind config, so no one has to manually apply it.
*   **Standardize Content Wrappers:** The mockups use varying background shades for the main content area (e.g., `bg-surface-container-low` vs `bg-surface-container`). You should update `<main>` in your `AuthenticatedLayout.tsx` to enforce a single, unified background color and padding structure.
*   **Create Reusable UI Components:** The mockups show fragmented button styles (some use `h-9 w-9` rounded-lg, others use `h-10 w-10` rounded-xl, and primary buttons lack consistent hover/shadow states). You should create reusable, standardized React components (e.g., `<Button>`, `<IconButton>`) in `frontend/src/components/` that encapsulate the correct Tailwind classes. Instruct the team to use these components instead of writing raw HTML buttons.
*   **Ensure Sidebar Presence:** One of the mockups (`Receptionist\dashboard.html`) completely missed the sidebar layout structure. Ensure that your `AuthenticatedLayout.tsx` strictly wraps *all* authenticated routes to prevent pages from breaking out of the navigation shell.

---

## 2. Global Project Status (Rest of the Team)

While the core scaffolding and RBAC are in place, several feature modules are incomplete and need attention from their respective owners:

*   **Chenith (Consultations & Treatments):**
    *   The backend routers for `treatments.py` and `consultations.py` are completely empty boilerplate (57 bytes each).
    *   The critically important combined `PUT /appointments/{id}/complete` endpoint (which processes diagnosis, notes, and treatments in one transaction) has not been implemented in `appointments.py` or `consultations.py`.
    *   The Treatment Catalogue admin page and Doctor's Consultation page need to be built in the frontend.
*   **Kalana (Appointments):**
    *   Check if the `POST /appointments/walk-in` and the reschedule/cancel endpoints (`PUT /appointments/{id}/reschedule`, etc.) are fully implemented in `appointments.py`.
*   **Shavinda (Billing):**
    *   Ensure all endpoints in `invoices.py` and `payments.py` are properly wired up to the frontend UI (Invoices list, detail view, and Collect Payment pages).
*   **Ashen (Reports & Dashboard):**
    *   Ensure the main dashboard composes data correctly and that the itemized doctor payment report route is functional and wired to the frontend.
