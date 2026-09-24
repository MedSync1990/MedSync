# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

## Directory Structure

The current working file structure for the frontend is organized as follows:

`	ext
src/
│
├── app/
│   ├── App.tsx
│   └── routes.tsx
│
├── layouts/
│   ├── AuthenticatedLayout.tsx
│   └── AuthLayout.tsx
│
├── pages/
│   ├── Login.tsx
│   │
│   ├── receptionist/
│   │   ├── Dashboard.tsx
│   │   ├── RegisterPatient.tsx
│   │   ├── PatientDirectory.tsx
│   │   ├── BookAppointment.tsx
│   │   ├── ManageAppointments.tsx
│   │   ├── Invoices.tsx
│   │   └── CollectPayment.tsx
│   │
│   ├── doctor/
│   │   ├── Dashboard.tsx
│   │   ├── MySchedule.tsx
│   │   ├── Consultation.tsx
│   │   ├── TreatmentCatalogue.tsx
│   │   └── MyEarnings.tsx
│   │
│   ├── branch-manager/
│   │   ├── Dashboard.tsx
│   │   └── BranchDetails.tsx
│   │
│   ├── admin/
│   │   ├── Dashboard.tsx
│   │   ├── ManageBranches.tsx
│   │   ├── ManageStaff.tsx
│   │   ├── ManageDoctors.tsx
│   │   └── ManageTreatmentCatalogue.tsx
│   │
│   └── reports/
│       ├── BranchAppointmentSummary.tsx
│       ├── DoctorRevenue.tsx
│       ├── OutstandingBalances.tsx
│       ├── TreatmentCategoryBreakdown.tsx
│       └── InsuranceVsOutOfPocket.tsx
│
├── components/
│   ├── Sidebar.tsx
│   ├── TopBar.tsx
│   ├── Breadcrumbs.tsx
│   ├── PageHeader.tsx
│   ├── DataTable.tsx
│   ├── StatusBadge.tsx
│   ├── Modal.tsx
│   ├── ConfirmDialog.tsx
│   ├── EmptyState.tsx
│   ├── LoadingState.tsx
│   └── Toast.tsx
│
├── services/
│   ├── api.ts
│   ├── authService.ts
│   ├── patientService.ts
│   ├── appointmentService.ts
│   ├── consultationService.ts
│   ├── invoiceService.ts
│   └── reportService.ts
│
├── context/
│   └── AuthContext.tsx
│
├── config/
│   └── navigation.ts
│
├── types/
│   └── index.ts
│
└── styles/
    └── globals.css
`
