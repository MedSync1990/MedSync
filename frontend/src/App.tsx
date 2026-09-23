import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './receptionist/components/layout/DashboardLayout';
import InvoicePage from './receptionist/pages/invoice/InvoicePage';
import DashboardPage from './pages/dashboard-page/DashboardPage';
import LoginPage from './pages/login-page/LoginPage';
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
        
        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
