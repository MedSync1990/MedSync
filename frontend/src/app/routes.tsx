import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthenticatedLayout } from '../layouts/AuthenticatedLayout';
import { AuthLayout } from '../layouts/AuthLayout';

// Auth
import { Login } from '../pages/Login';

// Receptionist
import ReceptionistDashboard from '../pages/receptionist/Dashboard';
import RegisterPatient from '../pages/receptionist/RegisterPatient';
import PatientDirectory from '../pages/receptionist/PatientDirectory';
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
import BranchAppointmentSummary from '../pages/reports/BranchAppointmentSummary';
import { DoctorRevenue } from '../pages/reports/DoctorRevenue';
import { OutstandingBalances } from '../pages/reports/OutstandingBalances';
import TreatmentCategoryBreakdown from '../pages/reports/TreatmentCategoryBreakdown';
import { InsuranceVsOutOfPocket } from '../pages/reports/InsuranceVsOutOfPocket';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Authenticated Application Routes */}
      <Route element={<AuthenticatedLayout />}>
        {/* Receptionist */}
        <Route path="/receptionist/dashboard" element={<ReceptionistDashboard />} />
        <Route path="/receptionist/register-patient" element={<RegisterPatient />} />
        <Route path="/receptionist/patients" element={<PatientDirectory />} />
        <Route path="/receptionist/book-appointment" element={<BookAppointment />} />
        <Route path="/receptionist/appointments" element={<ManageAppointments />} />
        <Route path="/receptionist/invoices" element={<Invoices />} />
        <Route path="/receptionist/invoices/:invoiceId" element={<Invoices />} />
        <Route path="/receptionist/collect-payment" element={<CollectPayment />} />

        {/* Doctor */}
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="/doctor/schedule" element={<MySchedule />} />
        <Route path="/doctor/consultation" element={<Consultation />} />
        <Route path="/doctor/treatment-catalogue" element={<TreatmentCatalogue />} />
        <Route path="/doctor/earnings" element={<MyEarnings />} />

        {/* Branch Manager */}
        <Route path="/branch-manager/dashboard" element={<BranchManagerDashboard />} />
        <Route path="/branch-manager/branch-details" element={<BranchDetails />} />

        {/* Admin */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/branches" element={<ManageBranches />} />
        <Route path="/admin/staff" element={<ManageStaff />} />
        <Route path="/admin/doctors" element={<ManageDoctors />} />
        <Route path="/admin/treatment-catalogue" element={<ManageTreatmentCatalogue />} />

        {/* Reports */}
        <Route path="/reports/appointments-summary" element={<BranchAppointmentSummary />} />
        <Route path="/reports/doctor-revenue" element={<DoctorRevenue />} />
        <Route path="/reports/outstanding-balances" element={<OutstandingBalances />} />
        <Route path="/reports/treatment-categories" element={<TreatmentCategoryBreakdown />} />
        <Route path="/reports/insurance-vs-out-of-pocket" element={<InsuranceVsOutOfPocket />} />

        {/* Fallback dashboard */}
        <Route path="/dashboard" element={<ReceptionistDashboard />} />
      </Route>

      {/* Redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
