import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './receptionist/components/layout/DashboardLayout';
import InvoicePage from './receptionist/pages/invoice/InvoicePage';
import DashboardPage from './pages/dashboard-page/DashboardPage';
import LoginPage from './pages/login-page/LoginPage';

// Shared layout for other roles
import { Layout } from './components/Layout';

// Reports
import { ReportsIndex } from './pages/reports/ReportsIndex';
import { AppointmentSummary } from './pages/reports/AppointmentSummary';
import { DoctorRevenue } from './pages/reports/DoctorRevenue';
import { OutstandingBalances } from './pages/reports/OutstandingBalances';
import { TreatmentCategories } from './pages/reports/TreatmentCategories';
import { InsuranceVsOutOfPocket } from './pages/reports/InsuranceVsOutOfPocket';

// Doctor pages
import { DoctorEarnings } from './pages/doctor/DoctorEarnings';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Receptionist Routes */}
        <Route path="/receptionist" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/receptionist/invoice" replace />} />
          <Route path="invoice" element={<InvoicePage />} />
          <Route path="invoice/:invoiceId" element={<InvoicePage />} />
          {/* Add more receptionist routes here later */}
        </Route>
        
        {/* Main Application Routes (Shared Layout) */}
        <Route element={<Layout />}>
          {/* Reports */}
          <Route path="/reports">
            <Route index element={<ReportsIndex />} />
            <Route path="appointments-summary" element={<AppointmentSummary />} />
            <Route path="doctor-revenue" element={<DoctorRevenue />} />
            <Route path="outstanding-balances" element={<OutstandingBalances />} />
            <Route path="treatment-categories" element={<TreatmentCategories />} />
            <Route path="insurance-vs-out-of-pocket" element={<InsuranceVsOutOfPocket />} />
          </Route>

          {/* Doctor Portal */}
          <Route path="/my-earnings" element={<DoctorEarnings />} />
        </Route>

        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function LegacyInvoiceRedirect() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  return <Navigate to={`/receptionist/invoices/${invoiceId || ''}`} replace />;
}

export default App;
