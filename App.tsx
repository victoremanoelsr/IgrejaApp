
import React from 'react';
import './i18n';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context';
import { MemberProvider, useMember } from './contexts/MemberContext';
import { Layout } from './components/Layout';
import { MemberLayout } from './components/member/MemberLayout';
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
import { MissionsPanel } from './pages/MissionsPanel';
import { YouthPanel } from './pages/YouthPanel';
import { ChildrenPanel } from './pages/ChildrenPanel';
import { LadiesPanel } from './pages/LadiesPanel';
import { MenPanel } from './pages/MenPanel';
import { Departments } from './pages/Departments';
import { Letters } from './pages/Letters';
import { Infrastructure } from './pages/Infrastructure';
import { MemberLogin } from './pages/member/MemberLogin';
import { MemberDashboard } from './pages/member/MemberDashboard';
import { MemberFinanceiro } from './pages/member/MemberFinanceiro';
import { MemberCarnets } from './pages/member/MemberCarnets';
import { MemberDocumentos } from './pages/member/MemberDocumentos';
import { MemberPerfil } from './pages/member/MemberPerfil';
import { CarteirinhaDigital } from './pages/member/CarteirinhaDigital';
import { MemberEventos } from './pages/member/MemberEventos';
import { BlockedPage } from './pages/BlockedPage';
import { BillingPage } from './pages/BillingPage';
import { ConfiguracoesSaas } from './pages/ConfiguracoesSaas';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, currentChurch, churches } = useApp();
  if (!user) return <Navigate to="/" replace />;

  // Bloqueio automático: se a SEDE da igreja atual estiver com status 'off' (active=false),
  // restringe o acesso à tela de Pagamento Pendente. SUPER_ADM nunca é bloqueado.
  if (user.role !== 'SUPER_ADM' && currentChurch) {
    let sede = currentChurch;
    if (sede.type === 'CONGREGACAO' && sede.parentId) {
      const parent = churches.find(c => c.id === sede.parentId);
      if (parent) sede = parent;
    }
    if (sede.active === false) {
      return <Navigate to="/bloqueado" replace />;
    }
  }
  
  const missionsRoles = ['PRESIDENTE_MISSOES', 'VICE_MISSOES', 'TESOUREIRO_MISSOES', 'SECRETARIO_MISSOES'];
  const youthRoles = ['LIDER_JOVENS', 'TESOUREIRO_JOVENS'];
  const childrenRoles = ['LIDER_CRIANCAS', 'TESOUREIRO_CRIANCAS'];
  const ladiesRoles = ['LIDER_SENHORAS', 'TESOUREIRO_SENHORAS'];
  const menRoles = ['LIDER_SENHORES', 'TESOUREIRO_SENHORES'];
  
  if (missionsRoles.includes(user.role) && window.location.hash !== '#/missoes') return <Navigate to="/missoes" replace />;
  if (youthRoles.includes(user.role) && window.location.hash !== '#/jovens') return <Navigate to="/jovens" replace />;
  if (childrenRoles.includes(user.role) && window.location.hash !== '#/criancas') return <Navigate to="/criancas" replace />;
  if (ladiesRoles.includes(user.role) && window.location.hash !== '#/senhoras') return <Navigate to="/senhoras" replace />;
  if (menRoles.includes(user.role) && window.location.hash !== '#/senhores') return <Navigate to="/senhores" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role) && !allowedRoles.includes('ALL')) {
     return <Navigate to="/" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

const ProtectedMemberRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useMember();
  if (!session) return <Navigate to="/" replace />;
  return <MemberLayout>{children}</MemberLayout>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/bloqueado" element={<BlockedPage />} />
      
      {/* Member Portal */}
      <Route path="/portal/login" element={<Navigate to="/" replace />} />
      <Route path="/portal/dashboard" element={<ProtectedMemberRoute><MemberDashboard /></ProtectedMemberRoute>} />
      <Route path="/portal/financeiro" element={<ProtectedMemberRoute><MemberFinanceiro /></ProtectedMemberRoute>} />
      <Route path="/portal/carnets" element={<ProtectedMemberRoute><MemberCarnets /></ProtectedMemberRoute>} />
      <Route path="/portal/documentos" element={<ProtectedMemberRoute><MemberDocumentos /></ProtectedMemberRoute>} />
      <Route path="/portal/perfil" element={<ProtectedMemberRoute><MemberPerfil /></ProtectedMemberRoute>} />
      <Route path="/portal/carteirinha" element={<ProtectedMemberRoute><CarteirinhaDigital /></ProtectedMemberRoute>} />
      <Route path="/portal/eventos" element={<ProtectedMemberRoute><MemberEventos /></ProtectedMemberRoute>} />
      <Route path="/portal" element={<Navigate to="/" replace />} />

      {/* Super Admin Panel */}
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['SUPER_ADM']}><SuperAdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/configuracoes-saas" element={<ProtectedRoute allowedRoles={['SUPER_ADM']}><ConfiguracoesSaas /></ProtectedRoute>} />

      {/* Nova Rota Central de Departamentos */}
      <Route path="/departamentos" element={<ProtectedRoute allowedRoles={['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE']}><Departments /></ProtectedRoute>} />

      {/* Rota Exclusiva de Missões */}
      <Route path="/missoes" element={<ProtectedRoute allowedRoles={['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO', 'PRESIDENTE_MISSOES', 'VICE_MISSOES', 'TESOUREIRO_MISSOES', 'SECRETARIO_MISSOES']}><MissionsPanel /></ProtectedRoute>} />

      {/* Rota Exclusiva de Jovens */}
      <Route path="/jovens" element={<ProtectedRoute allowedRoles={['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO', 'LIDER_JOVENS', 'TESOUREIRO_JOVENS']}><YouthPanel /></ProtectedRoute>} />

      {/* Rota Exclusiva de Crianças */}
      <Route path="/criancas" element={<ProtectedRoute allowedRoles={['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO', 'LIDER_CRIANCAS', 'TESOUREIRO_CRIANCAS']}><ChildrenPanel /></ProtectedRoute>} />

      {/* Rota Exclusiva de Senhoras */}
      <Route path="/senhoras" element={<ProtectedRoute allowedRoles={['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO', 'LIDER_SENHORAS', 'TESOUREIRO_SENHORAS']}><LadiesPanel /></ProtectedRoute>} />

      {/* Rota Exclusiva de Senhores */}
      <Route path="/senhores" element={<ProtectedRoute allowedRoles={['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO', 'LIDER_SENHORES', 'TESOUREIRO_SENHORES']}><MenPanel /></ProtectedRoute>} />

      {/* Standard Routes */}
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO']}><Dashboard /></ProtectedRoute>} />
      <Route path="/financeiro" element={<ProtectedRoute allowedRoles={['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO']}><Finance /></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute allowedRoles={['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO']}><Reports /></ProtectedRoute>} />
      <Route path="/membros" element={<ProtectedRoute allowedRoles={['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO']}><Members /></ProtectedRoute>} /> 
      <Route path="/cartas" element={<ProtectedRoute allowedRoles={['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO']}><Letters /></ProtectedRoute>} />
      <Route path="/campanhas" element={<ProtectedRoute allowedRoles={['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO']}><Campaigns /></ProtectedRoute>} />
      <Route path="/atas" element={<ProtectedRoute allowedRoles={['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO']}><Minutes /></ProtectedRoute>} />
      <Route path="/eventos" element={<ProtectedRoute allowedRoles={['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO']}><Events /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute allowedRoles={['SUPER_ADM', 'PRESIDENTE', 'DIRIGENTE']}><Settings /></ProtectedRoute>} />
      <Route path="/usuarios" element={<ProtectedRoute allowedRoles={['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE']}><Users /></ProtectedRoute>} />
      <Route path="/congregacoes" element={<ProtectedRoute allowedRoles={['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE']}><Congregations /></ProtectedRoute>} />
      <Route path="/infraestrutura" element={<ProtectedRoute allowedRoles={['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO']}><Infrastructure /></ProtectedRoute>} />
      <Route path="/faturamento" element={<ProtectedRoute allowedRoles={['PRESIDENTE', 'VICE_PRESIDENTE', 'TESOUREIRO']}><BillingPage /></ProtectedRoute>} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <MemberProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </MemberProvider>
    </AppProvider>
  );
};

export default App;
