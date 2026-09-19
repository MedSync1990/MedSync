import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './receptionist/components/layout/DashboardLayout';
import InvoicePage from './receptionist/pages/invoice/InvoicePage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Receptionist Routes */}
        <Route path="/receptionist" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/receptionist/invoice" replace />} />
          <Route path="invoice" element={<InvoicePage />} />
          <Route path="invoice/:invoiceId" element={<InvoicePage />} />
          {/* Add more receptionist routes here later */}
        </Route>
        
        {/* Redirect root to receptionist/invoice */}
        <Route path="/" element={<Navigate to="/receptionist/invoice" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
