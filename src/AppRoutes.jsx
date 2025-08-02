import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import AuthPage from './pages/AuthPage';
import CleaningForm from './pages/CleaningForm';
import MonitoreoTab from './components/Dashboard/MonitoreoTab';
import AnalisisTab from './components/Dashboard/AnalisisTab';
import EmpleadosTab from './components/Dashboard/EmpleadosTab';
import LocalesTab from './components/Dashboard/LocalesTab';
import ParteTab from './components/Dashboard/ParteTab';
import TableroTab from './components/Dashboard/TableroTab';
import AdminConfigTab from './components/Dashboard/AdminConfigTab';
import Dashboard from './pages/Dashboard';

function AppRoutes() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage initialTab={1} />} />
      <Route path="/cleaning/:uuid" element={<CleaningForm />} />

      {/* Ruta del dashboard con layout */}
      <Route path="/dashboard" element={
        <PrivateRoute>
          <Dashboard>
            <Outlet /> {/* Esto es crucial para renderizar los hijos */}
          </Dashboard>
        </PrivateRoute>
      }>
        <Route index element={<MonitoreoTab />} />
        <Route path="monitoreo" element={<MonitoreoTab />} />
        <Route path="analisis" element={<AnalisisTab />} />
        <Route path="personal" element={<EmpleadosTab />} />
        <Route path="locales" element={<LocalesTab />} />
        <Route path="parte" element={<ParteTab />} />
        <Route path="tablero" element={<TableroTab />} />
        <Route path="admin-config" element={<AdminConfigTab />} />
      </Route>

      {/* Redirecciones */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default AppRoutes;