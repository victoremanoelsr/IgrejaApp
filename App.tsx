import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Finance } from './pages/Finance';
import { Reports } from './pages/Reports';
import { Members } from './pages/Members';
import { Campaigns } from './pages/Campaigns';
import { Minutes } from './pages/Minutes';
import { Events } from './pages/Events';
import { Settings } from './pages/Settings';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { Users } from './pages/Users';
import { Congregations } from './pages/Congregations';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user } = useApp();
  if (!user) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
     return <Navigate to="/" replace />;
  }
  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      
      {/* Super Admin Panel */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRoles={['SUPER_ADM']}>
          <SuperAdminDashboard />
        </ProtectedRoute>
      } />

      {/* Church Operations Panel */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/financeiro" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/membros" element={<ProtectedRoute><Members /></ProtectedRoute>} />
      <Route path="/campanhas" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
      <Route path="/atas" element={<ProtectedRoute><Minutes /></ProtectedRoute>} />
      <Route path="/eventos" element={<ProtectedRoute><Events /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/usuarios" element={<ProtectedRoute><Users /></ProtectedRoute>} />
      <Route path="/congregacoes" element={<ProtectedRoute allowedRoles={['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE']}><Congregations /></ProtectedRoute>} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
};

export default App;