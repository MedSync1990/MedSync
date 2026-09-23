import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import InvoicePage from './pages/shared/InvoicePage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/receptionist/invoices" element={<InvoicePage />} />
          <Route path="/receptionist/invoices/:invoiceId" element={<InvoicePage />} />
        </Route>

        <Route path="/billing/invoices" element={<Navigate to="/receptionist/invoices" replace />} />
        <Route path="/billing/invoices/:invoiceId" element={<LegacyInvoiceRedirect />} />
        <Route path="/receptionist/invoice" element={<Navigate to="/receptionist/invoices" replace />} />
        <Route path="/receptionist/invoice/:invoiceId" element={<LegacyInvoiceRedirect />} />
        <Route path="/" element={<Navigate to="/receptionist/invoices" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function LegacyInvoiceRedirect() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  return <Navigate to={`/receptionist/invoices/${invoiceId || ''}`} replace />;
}

export default App;
