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

## Getting Started for Team Members (Run This After Pulling)

> [!NOTE]
> If you just cloned the repository or pulled the latest changes, the files (`package.json`, `tailwind.config.js`, `src/`, etc.) **are already created**. You do **NOT** need to re-run the initialization steps below.

All you need to do is install the dependencies and start the development server:

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies listed in package.json
npm install

# 3. (Optional) Setup environment variables if needed
# cp .env.example .env

# 4. Start the local Vite development server
npm run dev
```

The app will be available at `http://localhost:5173/`. It points at the backend's `VITE_API_BASE_URL` (default `http://localhost:8000/api/v1`) — see [`../README.md`](../README.md).

To verify there are no TypeScript or build errors:
```bash
npm run build
```

---

## One-Time Initialization History (Reference Only)

> [!WARNING]
> **Do NOT run these commands again.** These steps were executed once to bootstrap the project repository from scratch. They are documented here solely for reference and reproducibility.

Here are the step-by-step commands and actions used to initialize this React + TypeScript + Tailwind project:

### Step 1: Initialize `package.json`
Inside the `frontend/` directory, initialize the project:
```bash
cd frontend
npm init -y
```

### Step 2: Install Core & Dev Dependencies
Install React 18, React Router, Lucide icons, Tailwind CSS, TypeScript, and Vite:
```bash
# Core application dependencies
npm install react@^18.3.1 react-dom@^18.3.1 react-router-dom@^6.28.0 lucide-react clsx tailwind-merge

# Developer and build dependencies
npm install -D typescript@^5.6.3 vite@^6.0.1 @vitejs/plugin-react@^4.3.4 @types/react@^18.3.12 @types/react-dom@^18.3.1 tailwindcss@^3.4.15 postcss@^8.4.49 autoprefixer@^10.4.20
```

### Step 3: Configure Build & Tooling Files
The following configuration files were created:
1. `vite.config.ts`: Configures Vite with the `@vitejs/plugin-react` plugin.
2. `tsconfig.json`: Configures TypeScript for modern ES2020 syntax, JSX support (`react-jsx`), and strict type checking.
3. `postcss.config.js`: Integrates Tailwind CSS and Autoprefixer into the PostCSS pipeline.
4. `tailwind.config.js`: Sets up content paths (`./index.html`, `./src/**/*.{js,ts,jsx,tsx}`) and extends colors with the MedSync design tokens (`brand-navy-deep: #0F172A`, `brand-teal-light: #38BDF8`, `canvas-bg: #F8FAFC`, etc.) defined in `../docs/ui-guidelines.md`.

### Step 4: Setup HTML Entry & Fonts
Created `index.html` referencing Google Fonts (`Inter` and `Plus Jakarta Sans`) and Google Material Symbols icons:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
```
Points to `/src/main.tsx` as the entry script.

### Step 5: Setup Global Styles & Reusable Shell
1. `src/index.css`: Loaded `@tailwind base;`, `@tailwind components;`, and `@tailwind utilities;`.
2. Created reusable shell components:
   - `src/components/Sidebar.tsx`: Fixed dark navy sidebar (`#0F172A`) with role-based navigation sections.
   - `src/components/TopBar.tsx`: Fixed floating header with user greeting, branch badge, notifications, and profile.
   - `src/components/Layout.tsx`: Common shell wrapper hosting `<Sidebar />`, `<TopBar />`, and `<Outlet />`.
3. Created sample modular page and router:
   - `src/pages/DoctorDashboard.tsx`: Dashboard widgets.
   - `src/App.tsx`: Configured `BrowserRouter` with `Layout`.
   - `src/main.tsx`: Mounted the root React component.

### Step 6: Verify Build
Run the TypeScript check and Vite production bundle builder:
```bash
npm run build
```


