import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { formatPageTitle } from '../hooks/useDocumentTitle';

/**
 * Resolves a human-friendly page title based on the active route pathname.
 */
export const getRouteTitle = (pathname: string): string => {
  // Normalize pathname: remove trailing slash unless root
  const cleanPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  // Exact known routes
  switch (cleanPath) {
    case '/login':
      return 'Login';
    case '/logout':
      return 'Logout';
    case '/profile':
      return 'My Profile';
    case '/settings':
      return 'Settings';
    case '/help-center':
      return 'Help Center';
    case '/dashboard':
      return 'Dashboard';
    case '/treatment-catalogue':
      return 'Treatment Catalogue';

    // Receptionist
    case '/receptionist/dashboard':
      return 'Receptionist Dashboard';
    case '/receptionist/register-patient':
      return 'Register Patient';
    case '/receptionist/patients':
      return 'Patient Directory';
    case '/receptionist/book-appointment':
      return 'Book Appointment';
    case '/receptionist/appointments':
      return 'Manage Appointments';
    case '/receptionist/invoices':
      return 'Invoices & Billing';
    case '/receptionist/collect-payment':
      return 'Collect Payment';
    case '/receptionist/treatment-catalogue':
      return 'Treatment Catalogue';

    // Doctor
    case '/doctor/dashboard':
      return 'Doctor Dashboard';
    case '/doctor/schedule':
      return 'Doctor Schedule';
    case '/doctor/consultation':
    case '/consultation':
      return 'Consultation';
    case '/doctor/treatment-catalogue':
      return 'Treatment Catalogue';
    case '/doctor/earnings':
      return 'My Earnings';

    // Branch Manager
    case '/branch-manager/dashboard':
      return 'Branch Manager Dashboard';
    case '/branch-manager/branch-details':
      return 'Branch Details';
    case '/branch-manager/doctors':
      return 'Manage Doctors';
    case '/branch-manager/treatment-catalogue':
      return 'Treatment Catalogue';

    // Administrator
    case '/admin/dashboard':
      return 'Administrator Dashboard';
    case '/admin/branches':
      return 'Manage Branches';
    case '/admin/staff':
      return 'Manage Staff';
    case '/admin/staff/add':
      return 'Add Staff Member';
    case '/admin/doctors':
      return 'Manage Doctors';
    case '/admin/treatment-catalogue':
      return 'Manage Treatment Catalogue';
    case '/admin/doctor-payments':
      return 'Doctor Payments';

    // Reports
    case '/reports':
      return 'Reports & Analytics';
    case '/reports/appointments-summary':
      return 'Appointments Summary Report';
    case '/reports/doctor-revenue':
      return 'Doctor Revenue Report';
    case '/reports/outstanding-balances':
      return 'Outstanding Balances Report';
    case '/reports/treatment-categories':
      return 'Treatment Categories Breakdown';
    case '/reports/insurance-vs-out-of-pocket':
      return 'Insurance vs Out-of-Pocket Report';
    default:
      break;
  }

  // Dynamic parameterized routes
  if (cleanPath.startsWith('/receptionist/patients/')) {
    return 'Patient Profile';
  }
  if (cleanPath.startsWith('/receptionist/invoices/')) {
    return 'Invoice Details';
  }
  if (cleanPath.startsWith('/receptionist/collect-payment/')) {
    return 'Collect Payment';
  }
  if (cleanPath.startsWith('/doctor/consultation/')) {
    return 'Patient Consultation';
  }

  // Fallback formatting: convert last non-ID segment into readable title
  const segments = cleanPath.split('/').filter(Boolean);
  if (segments.length > 0) {
    const last = segments[segments.length - 1];
    const segment = (/^[0-9a-fA-F-]+$/.test(last) && segments.length > 1)
      ? segments[segments.length - 2]
      : last;

    return segment
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  return 'Healthcare Management';
};

/**
 * Component that automatically synchronizes document.title with the active route.
 */
export const DynamicPageTitle: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const pageTitle = getRouteTitle(location.pathname);
    document.title = formatPageTitle(pageTitle);
  }, [location.pathname]);

  return null;
};

export default DynamicPageTitle;
