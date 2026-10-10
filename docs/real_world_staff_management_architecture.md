# Staff Management Architecture: MedSync vs. Real-World Healthcare Systems

This document outlines the architectural and operational differences between **MedSync's current academic implementation** and **real-world enterprise Healthcare Information Systems (HIS / EHR / EMR)**, along with a comprehensive technical roadmap for transitioning the system into an enterprise-ready, compliant production application.

---

## 1. Executive Summary & Comparison Matrix

In healthcare IT, staff identity, credentials, and access permissions are subject to stringent legal, clinical, and regulatory mandates (such as **HIPAA**, **GDPR**, **ISO 27799 / ISO 27001**, and national medical council statutory guidelines).

| Dimension | MedSync (Current Implementation) | Real-World Enterprise Healthcare Systems |
| :--- | :--- | :--- |
| **Identity Source of Truth** | Directly created inside the app via manual web forms by Admins or Branch Managers. | **Centralized HRMS / Directory Services** (Workday, BambooHR, Azure AD, Okta, LDAP). Account provisioning is automated via **SCIM** webhooks. |
| **User Identity & Usernames** | Sequential role prefixes (e.g., `receptionist1`, `doctor3`). | **Unique Organizational Identifiers** (e.g., `dr.dilantha@hospital.lk` or `EMP-10492`). Generic role accounts are strictly prohibited by compliance audits. |
| **Credential Onboarding** | Static default password (e.g., `"medsync"`) verbally handed to the user. | **Zero-Knowledge Invitation Tokens**: One-time, time-expiring cryptographic links sent via verified email/SMS. Admins never set or see passwords. |
| **Authentication & Access** | Single-Factor Authentication (Username + Password). | **Mandatory MFA + SSO (SAML 2.0 / OIDC)**: Authenticator apps, FIDO2 keys, and Smartcard badge-tap (NFC/RFID) for rapid hospital workstation switching. |
| **Clinical Credentialing** | Medical license and specialty entered as unverified text/dropdown fields. | **Primary Source Verification (PSV)**: Real-time or batch verification against official Medical Councils (e.g., SLMC, GMC). Multi-tier clinical committee sign-off. |
| **Access Control Model** | Static Role-Based Access Control (**RBAC**) tied to one fixed `branch_id`. | **Attribute-Based & Policy-Based Access Control (ABAC / PBAC)**: Access granted dynamically based on active care-team membership, clinical shifts, and roster. |
| **Emergency Overrides** | Hard barriers with no override capability. | **"Break-the-Glass" Protocols**: Clinicians can access unassigned charts during critical emergencies with mandatory justification and high-priority audits. |
| **Audit Trails & Forensics** | Basic database timestamps (`last_login_at`) and simple log tables. | **Immutable Write-Once-Read-Many (WORM)** audit streams (SIEM, Splunk, Datadog). Every read, export, print, and search operation is logged. |
| **Profile Delegation** | No self-service; all edits routed through Admin/Branch Manager forms. | **Employee Self-Service (ESS)**: Staff update personal contact info and passwords independently; credentials and core identity are guarded by approval workflows. |

---

## 2. Deep-Dive Architectural Differences

### 2.1 Identity Provisioning & Lifecycle (Joiner-Mover-Leaver)
* **Current Method:**
  * When a new employee is hired, a local manager or system admin fills out a single modal form. If someone leaves, a button is clicked to set `is_active = FALSE`.
* **Real-World Reality:**
  * The medical clinic software is **never** the primary source of employee creation. Instead, the **Human Resources Information System (HRMS)** acts as the single source of truth.
  * When an employee is hired, transferred, or terminated in HRMS, automated identity synchronization (using the open **SCIM 2.0** protocol) provisions, updates, or revokes accounts across all hospital subsystems (EHR, Laboratory, Radiology/PACS, Pharmacy, and Billing) instantly.

### 2.2 Credential Privacy & Legal Non-Repudiation
* **Current Method:**
  * Staff accounts share predictable default passwords. If a staff member forgets their password, a manager types a new plaintext password directly into a prompt.
* **Real-World Reality:**
  * **Non-Repudiation Failure:** If an administrative manager has the power to set or view a doctor's active password, any clinical action (e.g., prescribing a controlled substance or signing a discharge order) can be legally contested in court: the clinician can plausibly claim, *"My manager or an admin logged in as me."*
  * In enterprise systems, **zero-knowledge credentialing** is enforced. Passwords can only be reset via secure out-of-band channels (SMS OTP, corporate email, or Self-Service Password Reset with MFA challenges). Helpdesk personnel can only invalidate sessions or issue temporary challenge codes.

### 2.3 Doctor Credentialing & Clinical Privileging
* **Current Method:**
  * A license number string and specialty are entered when creating a doctor, with no validation against official bodies or expiration tracking.
* **Real-World Reality:**
  * Clinical privileging is legally separated from administrative account creation:
    1. **Primary Source Verification:** The system interfaces with the medical council API or verification portal (e.g., Sri Lanka Medical Council) to ensure the license is active and free of disciplinary suspensions.
    2. **Privilege Scoping:** A general practitioner cannot perform complex surgeries; a doctor's record includes explicit granular privileges (e.g., `can_prescribe_schedule_ii_drugs`, `can_admit_inpatients`, `can_perform_minor_surgery`).
    3. **Expiration & Re-credentialing:** Malpractice insurance, annual board certifications, and CPR/BLS certifications have automated expiration dates. When expired, the system automatically revokes clinical signing privileges.

### 2.4 Multi-Branch Floating & Care-Team Relationships
* **Current Method:**
  * Every staff member has a rigid foreign key constraint: `branch_id INT NOT NULL REFERENCES branch(branch_id)`.
* **Real-World Reality:**
  * Medical specialists rarely work in only one clinic. A consultant doctor typically works at Colombo Central on Mondays and Wednesdays, Kandy on Fridays, and visits surgical theatres on-demand.
  * Real systems decouple users from a single physical branch using a **many-to-many roster association** (`staff_branch_assignment` with day-of-week and time-window validity).

---

## 3. Separation of Responsibilities: Access Delegation Matrix

To achieve enterprise-grade security and maintain clinical integrity, capabilities must be delegated across three distinct domains:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RESPONSIBILITY DOMAINS                          │
├──────────────────────────┬─────────────────────────┬───────────────────┤
│    STAFF SELF-SERVICE    │     BRANCH MANAGERS     │   ADMINISTRATORS  │
│      (My Profile)        │  (Operational Roster)   │ (System / Clinical│
│                          │                         │    Governance)    │
├──────────────────────────┼─────────────────────────┼───────────────────┤
│ • Update personal phones │ • Onboard local staff   │ • Branch transfers│
│ • Update home address    │ • Assign weekly rosters │ • License verif.  │
│ • Update personal email  │ • Temporary lock/unlock │ • Create managers │
│ • Self-change password   │ • Local deactivation    │ • System audit log│
│ • Manage notification    │ • Department oversight  │ • Role definition │
│   preferences            │                         │ • Core policy cfg │
└──────────────────────────┴─────────────────────────┴───────────────────┘
```

### What Each Actor Controls:
1. **The Respective Staff Member:**
   * **Allowed:** Personal contact telephone numbers, home address, emergency contacts, personal email, password change (requiring current password), notification settings.
   * **Prohibited:** Changing role, branch assignment, active status, NIC/identity numbers, or doctor clinical qualifications.
2. **The Branch Manager:**
   * **Allowed:** Viewing operational staff in their physical branch, scheduling shifts, adding doctors and receptionists to their local roster, deactivating departing local staff, unlocking locally locked accounts.
   * **Prohibited:** Modifying staff in other branches, creating Administrators, altering medical licenses, modifying national identity records.
3. **The System Administrator / Clinical Governance:**
   * **Allowed:** Inter-branch transfers, verification of doctor clinical licenses and specialties, creation of branch managers, oversight of system-wide audit logs and compliance flags.

---

## 4. Technical Roadmap: Transitioning MedSync to Enterprise Grade

To transform the current codebase into an enterprise-ready system, follow this phased implementation path:

### Phase 1: Near-Term Architectural Hardening (Immediate Codebase Upgrades)

1. **Implement Dedicated Self-Service Profile API:**
   * Introduce a secure endpoint `/api/v1/auth/profile` accessible to all authenticated users.
   * Users can update only their own non-sensitive attributes:
     ```sql
     -- Restricted user-editable fields
     UPDATE app_user
     SET address = $1, email = $2
     WHERE user_id = $CURRENT_USER_ID;
     ```
   * Allow managing multiple contact numbers in the `contact` table without managerial friction.

2. **Secure Self-Service Password Change:**
   * Create `/api/v1/auth/change-password` requiring `old_password` and `new_password`.
   * Verify the current hash with Argon2/bcrypt before updating the hash, preventing unauthorized password takeovers.

3. **Role & Privilege Enforcement in Staff Creation:**
   * Enforce role restrictions in `backend/app/routers/staff.py`:
     * Disallow creating `role_id = 5` (`Patient`) via staff endpoints.
     * Restrict Branch Managers from provisioning `Administrator` or `Branch Manager` accounts.

4. **Multi-Branch Visibility & Admin Branch Selector:**
   * Add a branch dropdown to `frontend/src/pages/admin/ManageStaff.tsx` for Administrators so staff can be assigned to Kandy, Galle, or Colombo rather than defaulting to `branch_id = 1`.
   * Include a branch filter in the staff directory table for multi-clinic management.

5. **Guard Doctor Deactivation:**
   * Prevent deactivating doctors who have upcoming appointments:
     ```sql
     SELECT COUNT(*) FROM appointment
     WHERE doctor_id = $1 AND appointment_date >= CURRENT_DATE AND status = 'Scheduled';
     ```
   * Abort deactivation with a 409 Conflict if unassigned appointments remain.

---

### Phase 2: Enterprise Authentication & Directory Services

1. **Single Sign-On (SSO) & OpenID Connect (OIDC):**
   * Integrate an identity provider (Keycloak, Authenticator, Azure AD / Microsoft Entra ID, or Okta).
   * Transition `POST /auth/login` to standard OAuth2 Authorization Code Flow with PKCE.
   * Enable Multi-Factor Authentication (MFA) via TOTP (Google Authenticator) or WebAuthn/FIDO2 biometrics.

2. **Automated Provisioning via SCIM:**
   * Expose standardized `/scim/v2/Users` endpoints allowing the corporate HR portal to push user onboarding and offboarding events directly to MedSync.

---

### Phase 3: Clinical Credentialing & Roster Decoupling

1. **Decouple Physical Branch into Roster Slots:**
   * Replace the single `staff.branch_id` column with a scheduling relationship:
     ```sql
     CREATE TABLE staff_branch_schedule (
         schedule_id   SERIAL PRIMARY KEY,
         user_id       INT REFERENCES staff(user_id),
         branch_id     INT REFERENCES branch(branch_id),
         day_of_week   SMALLINT, -- 1=Monday ... 7=Sunday
         start_time    TIME NOT NULL,
         end_time      TIME NOT NULL,
         is_active     BOOLEAN DEFAULT TRUE
     );
     ```

2. **Clinical Privileging & Verification Engine:**
   * Introduce credential expiration and verification metadata:
     ```sql
     CREATE TABLE doctor_credential (
         credential_id     SERIAL PRIMARY KEY,
         doctor_id         INT REFERENCES doctor(user_id),
         license_number    VARCHAR(50) NOT NULL,
         verifying_body    VARCHAR(100) DEFAULT 'SLMC',
         verified_at       TIMESTAMPTZ,
         verified_by       INT REFERENCES app_user(user_id),
         expires_at        DATE NOT NULL,
         is_verified       BOOLEAN DEFAULT FALSE
     );
     ```

---

### Phase 4: Compliance Auditing & "Break-the-Glass" Protocols

1. **WORM / Tamper-Evident Audit Logging:**
   * Move audit logs from standard PostgreSQL tables to append-only event stores or stream them via TLS to a centralized log management platform (OpenSearch, Splunk, CloudWatch).
   * Record full contextual metadata on every patient access event:
     * `actor_user_id`, `patient_id`, `action` (`VIEW`, `EDIT`, `EXPORT`, `PRESCRIBE`), `ip_address`, `device_fingerprint`, `timestamp`.

2. **Emergency "Break-the-Glass" Override:**
   * Implement emergency access bypass for licensed clinicians:
     * When a doctor needs urgent access to an unassigned patient record, provide a "Break-the-Glass" confirmation modal.
     * The clinician submits an emergency reason (e.g., *"Cardiac arrest intake in ER"*).
     * Immediate temporary access is granted for 4 hours, and a high-severity notification is dispatched to the Hospital Privacy Officer and Clinical Governance Board for forensic review.
