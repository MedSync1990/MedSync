# MedSync CATMS — API Routes

Base path: `/api/v1`. All routes except `/auth/login` require `Authorization: Bearer <JWT>`.
Role column shows who is allowed to call it (A=Admin, BM=Branch Manager, D=Doctor, R=Receptionist, P=Patient).

## Auth
| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/auth/login` | any | returns JWT; tracks failed attempts, locks account after threshold (FR-UAC-06) |
| POST | `/auth/logout` | all | invalidates session |
| GET | `/auth/me` | all | current user + role |

## Branches
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/branches` | A, BM | list |
| POST | `/branches` | A | create |
| PUT | `/branches/{id}` | A | update |
| DELETE | `/branches/{id}` | A | blocked if staff assigned (FR-DMI-08) |

## Staff & Doctors
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/staff` | A | list, filter by branch/role |
| POST | `/staff` | A | register staff, assign branch+role |
| PUT | `/staff/{id}` | A | update / deactivate |
| GET | `/doctors` | all | list, filter by specialty/branch |
| POST | `/doctors` | A | register doctor |
| PUT | `/doctors/{id}/specialties` | A | assign/remove specialties |
| GET | `/specialties` | all | list |
| POST | `/specialties` | A | create |

## Patients
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/patients?search=` | A, BM, R, D | search by NIC, name, or contact (FR-PM-04) |
| POST | `/patients` | R | register (any branch, records accessible everywhere) |
| GET | `/patients/{id}` | A, BM, R, D, P(self) | full profile incl. history |
| PUT | `/patients/{id}` | R | update, preserves history |
| POST | `/patients/{id}/insurance` | R | register policy |

## Appointments
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/doctors/{id}/availability?date=` | R, D | open slots |
| POST | `/appointments` | R | book — server enforces no-overlap (FR-AM-03) |
| POST | `/appointments/walk-in` | R | emergency walk-in, no prior slot |
| PUT | `/appointments/{id}/reschedule` | R | new slot, re-validates availability |
| PUT | `/appointments/{id}/cancel` | R | requires confirmation on client; sets status |
| GET | `/appointments?branch=&date=&status=` | A, BM, R | for the daily summary + calendar view |

## Consultations & Treatments
| Method | Path | Role | Notes |
|---|---|---|---|
| PUT | `/appointments/{id}/complete` | D | requires consultation notes present (FR-CTM-07) |
| POST | `/appointments/{id}/consultation` | D | notes + diagnosis |
| POST | `/appointments/{id}/treatments` | D | attach one or more from catalogue; blocked unless status=Completed (FR-CTM-06) |
| GET | `/treatments` | all | catalogue |
| POST | `/treatments` | A | add treatment |
| PUT | `/treatments/{code}` | A | update price/eligibility |
| DELETE | `/treatments/{code}` | A | soft-delete if linked to records (FR-TCM-05) |

## Billing
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/invoices/{id}` | A, BM, R, P(self) | totals, insurance split, status |
| GET | `/patients/{id}/invoices` | R, P(self) | history |
| POST | `/invoices/{id}/payments` | R | full/partial; server rejects amount > outstanding (FR-BPM-06) |
| GET | `/patients/{id}/balance` | R, BM, P(self) | outstanding total |

## Insurance
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/patients/{id}/insurance` | A, BM, R, D, P(self) | policy details |
| POST | `/insurance/verify` | R | checks policy active before claim |

## Reports
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/reports/appointments-summary?branch=&date=` | A, BM | scheduled/completed/cancelled counts |
| GET | `/reports/doctor-revenue?from=&to=` | A, BM | per-doctor revenue |
| GET | `/reports/outstanding-balances` | A, BM | patients with dues |
| GET | `/reports/treatment-categories?from=&to=` | A, BM | counts per category |
| GET | `/reports/insurance-vs-out-of-pocket?from=&to=` | A, BM | coverage split |

## Conventions
- All list endpoints support pagination (`?page=&limit=`) and return `{data, total, page}`.
- All mutating endpoints return the created/updated resource, not just a status code.
- Validation errors: `422` with `{field, message}` array — matches the SRS requirement for
  "meaningful validation messages" (§3.1).
- Every route handler delegates business logic to a service function / stored procedure call —
  no SQL string-building in the route handler itself (SQL injection prevention, §5.3.5).
