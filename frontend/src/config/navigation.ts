export interface NavItem {
  label: string;
  path: string;
  icon?: string;
  roles: Array<'Administrator' | 'Branch Manager' | 'Doctor' | 'Receptionist' | 'Cashier' | 'Patient'>;
}

export const navigationConfig: NavItem[] = [
  // Receptionist
  { label: 'Dashboard', path: '/receptionist/dashboard', roles: ['Receptionist'] },
  { label: 'Register Patient', path: '/receptionist/register-patient', roles: ['Receptionist'] },
  { label: 'Patient Directory', path: '/receptionist/patients', roles: ['Receptionist'] },
  { label: 'Book Appointment', path: '/receptionist/book-appointment', roles: ['Receptionist'] },
  { label: 'Manage Appointments', path: '/receptionist/appointments', roles: ['Receptionist'] },
  { label: 'Invoices', path: '/receptionist/invoices', roles: ['Receptionist', 'Cashier'] },
  { label: 'Collect Payment', path: '/receptionist/collect-payment', roles: ['Receptionist', 'Cashier'] },

  // Doctor
  { label: 'Dashboard', path: '/doctor/dashboard', roles: ['Doctor'] },
  { label: 'My Schedule', path: '/doctor/schedule', roles: ['Doctor'] },
  { label: 'Consultation', path: '/doctor/consultation', roles: ['Doctor'] },
  { label: 'Treatment Catalogue', path: '/doctor/treatment-catalogue', roles: ['Doctor'] },
  { label: 'My Earnings', path: '/doctor/earnings', roles: ['Doctor'] },

  // Branch Manager
  { label: 'Dashboard', path: '/branch-manager/dashboard', roles: ['Branch Manager'] },
  { label: 'Branch Details', path: '/branch-manager/branch-details', roles: ['Branch Manager'] },

  // Admin
  { label: 'Dashboard', path: '/admin/dashboard', roles: ['Administrator'] },
  { label: 'Manage Branches', path: '/admin/branches', roles: ['Administrator'] },
  { label: 'Manage Staff', path: '/admin/staff', roles: ['Administrator'] },
  { label: 'Manage Doctors', path: '/admin/doctors', roles: ['Administrator', 'Branch Manager'] },
  { label: 'Treatment Catalogue', path: '/admin/treatment-catalogue', roles: ['Administrator'] },

  // Reports
  { label: 'Appointment Summary', path: '/reports/appointments-summary', roles: ['Administrator', 'Branch Manager'] },
  { label: 'Doctor Revenue', path: '/reports/doctor-revenue', roles: ['Administrator', 'Branch Manager'] },
  { label: 'Outstanding Balances', path: '/reports/outstanding-balances', roles: ['Administrator', 'Branch Manager'] },
  { label: 'Treatment Breakdown', path: '/reports/treatment-categories', roles: ['Administrator', 'Branch Manager'] },
  { label: 'Insurance vs Out of Pocket', path: '/reports/insurance-vs-out-of-pocket', roles: ['Administrator', 'Branch Manager'] },
];
