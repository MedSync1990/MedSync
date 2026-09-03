# MedSync CATMS — Frontend

React + TypeScript application. See [`../docs/architecture.md`](../docs/architecture.md) §4 for
folder layout, [`../docs/ui-guidelines.md`](../docs/ui-guidelines.md) for component/interaction
rules, and [`../docs/page-content.md`](../docs/page-content.md) for the copy each page must use.

## Expected structure (fill in as pages are built)

```
frontend/
├── package.json
├── .env.example                # VITE_API_BASE_URL etc., mirrors root .env.example
├── Dockerfile                    # added in Phase 5 — see ../docs/docker.md
├── nginx.conf                     # added alongside Dockerfile, see ../docs/docker.md
└── src/
    ├── main.tsx                    # app entry point
    ├── App.tsx                      # router setup, layout shell
    ├── auth/
    │   ├── AuthContext.tsx            # JWT storage, current user/role
    │   └── RequireRole.tsx             # route guard component
    ├── components/
    │   ├── Sidebar.tsx                  # role-filtered nav — owner: Jayarathne
    │   ├── TopBar.tsx                    # owner: Jayarathne
    │   ├── ConfirmDialog.tsx              # shared confirmation modal
    │   ├── StatusPill.tsx                  # Scheduled/Completed/Cancelled etc.
    │   └── EmptyState.tsx                   # "no data" pattern, FR-RA-06
    ├── api/
    │   ├── client.ts                # typed fetch wrapper, attaches JWT
    │   ├── auth.ts / branches.ts / staff.ts        # owner: Jayarathne
    │   ├── doctors.ts / appointments.ts             # owner: Jayawardena
    │   ├── patients.ts / consultations.ts / treatments.ts   # owner: Garusinghe
    │   ├── billing.ts / insurance.ts                  # owner: Thilakarathna
    │   └── reports.ts                                   # owner: Silva
    └── pages/
        ├── Login.tsx                          # owner: Jayarathne
        ├── Dashboard.tsx                        # owner: Silva
        ├── branches/ManageBranches.tsx           # owner: Jayarathne
        ├── staff/ManageStaff.tsx                  # owner: Jayarathne
        ├── doctors/ManageDoctors.tsx               # owner: Jayawardena
        ├── appointments/BookAppointment.tsx         # owner: Jayawardena
        ├── appointments/ManageAppointments.tsx        # owner: Jayawardena
        ├── patients/RegisterPatient.tsx                # owner: Garusinghe
        ├── patients/PatientDirectory.tsx                 # owner: Garusinghe
        ├── consultations/Consultation.tsx                 # owner: Garusinghe
        ├── treatments/TreatmentCatalogue.tsx                # owner: Garusinghe
        ├── billing/Invoices.tsx                               # owner: Thilakarathna
        ├── billing/CollectPayment.tsx                          # owner: Thilakarathna
        └── reports/                                              # owner: Silva
            ├── AppointmentSummary.tsx
            ├── DoctorRevenue.tsx
            ├── OutstandingBalances.tsx
            ├── TreatmentCategories.tsx
            └── InsuranceVsOutOfPocket.tsx
```

Page ownership matches [`../docs/workload-division.md`](../docs/workload-division.md) — each
page should be created and worked on inside its owner's `phase-*-<lastname>` branch.

## Setup (once `package.json` exists)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Points at the backend's `VITE_API_BASE_URL` (default `http://localhost:8000/api/v1`) — see
[`../README.md`](../README.md).
