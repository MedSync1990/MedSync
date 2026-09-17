import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { DoctorSchedule } from './pages/doctor/DoctorSchedule';
import { DoctorConsultation } from './pages/doctor/DoctorConsultation';
import { DoctorEarnings } from './pages/doctor/DoctorEarnings';
import { DoctorTreatmentCatalogue } from './pages/doctor/DoctorTreatmentCatalogue';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Universal Layout Shell wrapping all authenticated application routes */}
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-schedule" element={<DoctorSchedule />} />
            <Route path="/consultation" element={<DoctorConsultation />} />
            <Route path="/my-earnings" element={<DoctorEarnings />} />
            <Route path="/treatment-catalogue" element={<DoctorTreatmentCatalogue />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
