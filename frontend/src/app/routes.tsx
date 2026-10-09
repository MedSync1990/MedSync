import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthenticatedLayout } from '../layouts/AuthenticatedLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { RoleGuard } from '../components/RoleGuard';
import { LoadingState } from '../components/LoadingState';

// Auth
const Login = lazy(() => import('../pages/Login').then(m => ({ default: m.Login })));
const Logout = lazy(() => import('../pages/logout').then(m => ({ default: m.Logout })));
const Profile = lazy(() => import('../pages/Profile').then(m => ({ default: m.Profile || m.default })));

// Receptionist
const ReceptionistDashboard = lazy(() => import('../pages/receptionist/Dashboard'));
const RegisterPatient = lazy(() => import('../pages/receptionist/RegisterPatient'));
const PatientDirectory = lazy(() => import('../pages/receptionist/PatientDirectory'));
const PatientProfile = lazy(() => import('../pages/receptionist/PatientProfile'));
const BookAppointment = lazy(() => import('../pages/receptionist/BookAppointment'));
const ManageAppointments = lazy(() => import('../pages/receptionist/ManageAppointments'));
const Invoices = lazy(() => import('../pages/receptionist/Invoices'));
const CollectPayment = lazy(() => import('../pages/receptionist/CollectPayment'));

// Doctor
const DoctorDashboard = lazy(() => import('../pages/doctor/Dashboard'));
const MySchedule = lazy(() => import('../pages/doctor/MySchedule'));
const Consultation = lazy(() => import('../pages/doctor/Consultation'));
const TreatmentCatalogue = lazy(() => import('../pages/doctor/TreatmentCatalogue'));
const MyEarnings = lazy(() => import('../pages/doctor/MyEarnings'));

// Branch Manager
const BranchManagerDashboard = lazy(() => import('../pages/branch-manager/Dashboard'));
const BranchDetails = lazy(() => import('../pages/branch-manager/BranchDetails'));

// Admin
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));
const ManageBranches = lazy(() => import('../pages/admin/ManageBranches'));
const ManageStaff = lazy(() => import('../pages/admin/ManageStaff'));
const ManageDoctors = lazy(() => import('../pages/admin/ManageDoctors'));
const ManageTreatmentCatalogue = lazy(() => import('../pages/admin/ManageTreatmentCatalogue'));
const DoctorPayments = lazy(() => import('../pages/admin/DoctorPayments'));

// Reports
const ReportsIndex = lazy(() => import('../pages/reports/ReportsIndex').then(m => ({ default: m.ReportsIndex })));
const BranchAppointmentSummary = lazy(() => import('../pages/reports/BranchAppointmentSummary'));
const DoctorRevenue = lazy(() => import('../pages/reports/DoctorRevenue'));
const OutstandingBalances = lazy(() => import('../pages/reports/OutstandingBalances').then(m => ({ default: m.OutstandingBalances })));
const TreatmentCategoryBreakdown = lazy(() => import('../pages/reports/TreatmentCategoryBreakdown'));
const InsuranceVsOutOfPocket = lazy(() => import('../pages/reports/InsuranceVsOutOfPocket').then(m => ({ default: m.InsuranceVsOutOfPocket })));
const HelpCenter = lazy(() => import('../pages/HelpCenter'));

const RoleDashboardRedirect: React.FC = () => {
  const { user } = useAuth();
  switch (user?.role) {
    case 'Administrator':
      return <Navigate to="/admin/dashboard" replace />;
    case 'Branch Manager':
      return <Navigate to="/branch-manager/dashboard" replace />;
    case 'Doctor':
      return <Navigate to="/doctor/dashboard" replace />;
    case 'Receptionist':
    default:
      return <Navigate to="/receptionist/dashboard" replace />;
  }
};

const RoleTreatmentCatalogueRedirect: React.FC = () => {
  const { user } = useAuth();
  switch (user?.role) {
    case 'Administrator':
      return <Navigate to="/admin/treatment-catalogue" replace />;
    case 'Branch Manager':
      return <Navigate to="/branch-manager/treatment-catalogue" replace />;
    case 'Doctor':
      return <Navigate to="/doctor/treatment-catalogue" replace />;
    case 'Receptionist':
    default:
      return <Navigate to="/receptionist/treatment-catalogue" replace />;
  }
};

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><LoadingState message="Loading..." /></div>}>
      <Routes>
        {/* Public Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/logout" element={<Logout />} />
        </Route>

        {/* Authenticated Application Routes */}
        <Route element={<AuthenticatedLayout />}>
          <Route path="/help-center" element={<HelpCenter />} />

          {/* Receptionist Routes */}
          <Route element={<RoleGuard allowedRoles={['Receptionist', 'Administrator', 'Branch Manager']} />}>
            <Route path="/receptionist/dashboard" element={<ReceptionistDashboard />} />
            <Route path="/receptionist/register-patient" element={<RegisterPatient />} />
            <Route path="/receptionist/patients" element={<PatientDirectory />} />
            <Route path="/receptionist/patients/:patientId" element={<PatientProfile />} />
            <Route path="/receptionist/book-appointment" element={<BookAppointment />} />
            <Route path="/receptionist/appointments" element={<ManageAppointments />} />
            <Route path="/receptionist/invoices" element={<Invoices />} />
            <Route path="/receptionist/invoices/:invoiceId" element={<Invoices />} />
            <Route path="/receptionist/collect-payment" element={<CollectPayment />} />
            <Route path="/receptionist/collect-payment/:invoiceCode" element={<CollectPayment />} />
            <Route path="/receptionist/treatment-catalogue" element={<TreatmentCatalogue />} />
          </Route>

          {/* Doctor Routes */}
          <Route element={<RoleGuard allowedRoles={['Doctor']} />}>
            <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
            <Route path="/doctor/schedule" element={<MySchedule />} />
            <Route path="/doctor/consultation" element={<Consultation />} />
            <Route path="/doctor/consultation/:patientId" element={<Consultation />} />
            <Route path="/consultation" element={<Navigate to="/doctor/consultation" replace />} />
            <Route path="/doctor/treatment-catalogue" element={<TreatmentCatalogue />} />
            <Route path="/doctor/earnings" element={<MyEarnings />} />
          </Route>

          {/* Branch Manager Routes */}
          <Route element={<RoleGuard allowedRoles={['Branch Manager', 'Administrator']} />}>
            <Route path="/branch-manager/dashboard" element={<BranchManagerDashboard />} />
            <Route path="/branch-manager/branch-details" element={<BranchDetails />} />
            <Route path="/branch-manager/doctors" element={<ManageDoctors />} />
            <Route path="/branch-manager/treatment-catalogue" element={<TreatmentCatalogue />} />
          </Route>

          {/* Shared Staff Management Route */}
          <Route element={<RoleGuard allowedRoles={['Administrator', 'Branch Manager']} />}>
            <Route path="/admin/staff" element={<ManageStaff />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<RoleGuard allowedRoles={['Administrator']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/branches" element={<ManageBranches />} />
            <Route path="/admin/doctors" element={<ManageDoctors />} />
            <Route path="/admin/treatment-catalogue" element={<ManageTreatmentCatalogue />} />
            <Route path="/admin/doctor-payments" element={<DoctorPayments />} />
          </Route>

          {/* Reports Routes */}
          <Route element={<RoleGuard allowedRoles={['Administrator', 'Branch Manager']} />}>
            <Route path="/reports" element={<ReportsIndex />} />
            <Route path="/reports/appointments-summary" element={<BranchAppointmentSummary />} />
            <Route path="/reports/doctor-revenue" element={<DoctorRevenue />} />
            <Route path="/reports/outstanding-balances" element={<OutstandingBalances />} />
            <Route path="/reports/treatment-categories" element={<TreatmentCategoryBreakdown />} />
            <Route path="/reports/insurance-vs-out-of-pocket" element={<InsuranceVsOutOfPocket />} />
          </Route>

          {/* System & Global Routes */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Navigate to="/profile" replace />} />
          {/* Help Center (Static override for public access / layout integration) */}
          <Route path="/help-center" element={
            <div className="py-6 max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Help Center</h1>
              <p className="text-slate-600">User guides, documentation, and support resources.</p>
            </div>
          } />

          {/* Dynamic Role Dashboard & Treatment Catalogue redirects */}
          <Route path="/dashboard" element={<RoleDashboardRedirect />} />
          <Route path="/treatment-catalogue" element={<RoleTreatmentCatalogueRedirect />} />
        </Route>

        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
