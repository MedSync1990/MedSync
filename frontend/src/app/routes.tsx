import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthenticatedLayout } from '../layouts/AuthenticatedLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { RoleGuard } from '../components/RoleGuard';

// Auth
import { Login } from '../pages/Login';

// Receptionist
import ReceptionistDashboard from '../pages/receptionist/Dashboard';
import RegisterPatient from '../pages/receptionist/RegisterPatient';
import PatientDirectory from '../pages/receptionist/PatientDirectory';
import PatientProfile from '../pages/receptionist/PatientProfile';
import BookAppointment from '../pages/receptionist/BookAppointment';
import ManageAppointments from '../pages/receptionist/ManageAppointments';
import Invoices from '../pages/receptionist/Invoices';
import CollectPayment from '../pages/receptionist/CollectPayment';

// Doctor
import DoctorDashboard from '../pages/doctor/Dashboard';
import MySchedule from '../pages/doctor/MySchedule';
import Consultation from '../pages/doctor/Consultation';
import TreatmentCatalogue from '../pages/doctor/TreatmentCatalogue';
import MyEarnings from '../pages/doctor/MyEarnings';

// Branch Manager
import BranchManagerDashboard from '../pages/branch-manager/Dashboard';
import BranchDetails from '../pages/branch-manager/BranchDetails';

// Admin
import AdminDashboard from '../pages/admin/Dashboard';
import ManageBranches from '../pages/admin/ManageBranches';
import ManageStaff from '../pages/admin/ManageStaff';
import ManageDoctors from '../pages/admin/ManageDoctors';
import ManageTreatmentCatalogue from '../pages/admin/ManageTreatmentCatalogue';

// Reports
import { ReportsIndex } from '../pages/reports/ReportsIndex';
import BranchAppointmentSummary from '../pages/reports/BranchAppointmentSummary';
import { DoctorRevenue } from '../pages/reports/DoctorRevenue';
import { OutstandingBalances } from '../pages/reports/OutstandingBalances';
import TreatmentCategoryBreakdown from '../pages/reports/TreatmentCategoryBreakdown';
import { InsuranceVsOutOfPocket } from '../pages/reports/InsuranceVsOutOfPocket';

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

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Authenticated Application Routes */}
      <Route element={<AuthenticatedLayout />}>
        {/* Receptionist Routes */}
        <Route element={<RoleGuard allowedRoles={['Receptionist', 'Administrator']} />}>
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
        </Route>

        {/* Doctor Routes */}
        <Route element={<RoleGuard allowedRoles={['Doctor']} />}>
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="/doctor/schedule" element={<MySchedule />} />
          <Route path="/doctor/consultation" element={<Consultation />} />
          <Route path="/doctor/treatment-catalogue" element={<TreatmentCatalogue />} />
          <Route path="/doctor/earnings" element={<MyEarnings />} />
        </Route>

        {/* Branch Manager Routes */}
        <Route element={<RoleGuard allowedRoles={['Branch Manager', 'Administrator']} />}>
          <Route path="/branch-manager/dashboard" element={<BranchManagerDashboard />} />
          <Route path="/branch-manager/branch-details" element={<BranchDetails />} />
          <Route path="/branch-manager/doctors" element={<ManageDoctors />} />
        </Route>

        {/* Admin Routes */}
        <Route element={<RoleGuard allowedRoles={['Administrator']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/branches" element={<ManageBranches />} />
          <Route path="/admin/staff" element={<ManageStaff />} />
          <Route path="/admin/doctors" element={<ManageDoctors />} />
          <Route path="/admin/treatment-catalogue" element={<ManageTreatmentCatalogue />} />
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

        {/* Dynamic Role Dashboard redirect */}
        <Route path="/dashboard" element={<RoleDashboardRedirect />} />
      </Route>

      {/* Redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
