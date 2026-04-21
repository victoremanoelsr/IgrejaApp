import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';
import { useApp } from '../context';
import { 
  LayoutDashboard, 
  Wallet, 
  Users as UsersIcon, 
  Megaphone, 
  FileText, 
  Calendar, 
  Settings, 
  LogOut,
  Building,
  Menu,
  X,
  ShieldCheck,
  EyeOff,
  ChevronDown,
  Network,
  Home,
  MapPin,
  CornerDownRight,
  Globe,
  HeartHandshake,
  DollarSign,
  BookOpen,
  ArrowLeft,
  Users,
  Mail,
  Zap,
  Baby,
  Heart,
  Layout as LayoutIcon,
  Building2,
  Wifi,
  WifiOff,
  CreditCard,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Church } from '../types';
import { NotificationCenter } from './NotificationCenter';

interface ChurchOptionProps {
  church: Church;
  isChild?: boolean;
  currentChurch: Church | null;
  onSelect: (churchId: string) => void;
}

// Helper Component for List Item
const ChurchOption: React.FC<ChurchOptionProps> = ({ church, isChild = false, currentChurch, onSelect }) => (
  <button
      onClick={() => onSelect(church.id)}
      className={`w-full text-left px-3 py-3 text-sm border-b border-gray-800 last:border-0 hover:bg-gray-800 transition-colors flex items-center group relative ${church.id === currentChurch?.id ? 'bg-red-900/10' : ''} ${isChild ? 'pl-8 bg-[#151515]' : ''}`}
  >
      {isChild && (
          <CornerDownRight size={14} className="absolute left-3 text-gray-600" />
      )}
      
      <div className={`mr-3 p-1.5 rounded-md shrink-0 ${church.type === 'SEDE' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-400'}`}>
          {church.type === 'SEDE' ? <Home size={14}/> : <MapPin size={14}/>}
      </div>
      <div className="flex-1 min-w-0">
          <p className={`font-medium truncate ${church.id === currentChurch?.id ? 'text-brand-orange' : 'text-gray-300 group-hover:text-white'}`}>
              {church.name}
          </p>
          <p className="text-[10px] text-gray-600 uppercase font-bold">
              {church.type}
          </p>
      </div>
      {church.id === currentChurch?.id && <div className="w-1.5 h-1.5 rounded-full bg-brand-orange ml-2"></div>}
  </button>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, currentChurch, availableChurches, selectChurch, exitAdminView, members, isOnline, pendingOfflineCount } = useApp();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopHovered, setIsDesktopHovered] = useState(false);
  const [showChurchSelector, setShowChurchSelector] = useState(false);
  const [showLangSelector, setShowLangSelector] = useState(false);

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('i18n_language', code);
    setShowLangSelector(false);
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingOfflineCount > 0) {
        e.preventDefault();
        e.returnValue = `Você possui ${pendingOfflineCount} lançamento(s) offline ainda não sincronizados. Tem certeza que deseja sair?`;
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingOfflineCount]);

  // --- DINAMIC APP ICON LOGIC ---
  // Atualiza o ícone do navegador e do "Adicionar à Tela de Início" (iOS) 
  // com a logo da igreja atual, se existir.
  useEffect(() => {
    if (currentChurch?.logoUrl) {
      // Atualiza Apple Touch Icon (iOS Home Screen)
      let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      if (appleIcon) {
        appleIcon.href = currentChurch.logoUrl;
      } else {
        // Se não existir, cria (fallback)
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        appleIcon.href = currentChurch.logoUrl;
        document.head.appendChild(appleIcon);
      }

      // Atualiza Favicon (Navegador e Android em alguns casos)
      let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (!favicon) {
         favicon = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement;
      }
      
      if (favicon) {
        favicon.href = currentChurch.logoUrl;
      }
    }
  }, [currentChurch]);
  // -----------------------------
  
  if (!user) return <>{children}</>;

  const linkedMember = members.find(m => m.id === user.id);
  const userPhotoUrl = linkedMember?.photo;

  const isSuperAdminGlobal = user.role === 'SUPER_ADM' && !currentChurch; 
  const isGhostMode = user.role === 'SUPER_ADM' && currentChurch;
  const isExpanded = isMobileOpen || isDesktopHovered;

  const locationState = location.state as { entered?: boolean; activeTab?: string } | null;
  
  // Context Checks
  const isMissionsEntered = location.pathname.startsWith('/missoes') && !!locationState?.entered;
  const isYouthEntered = location.pathname.startsWith('/jovens') && !!locationState?.entered;
  const isChildrenEntered = location.pathname.startsWith('/criancas') && !!locationState?.entered;
  const isLadiesEntered = location.pathname.startsWith('/senhoras') && !!locationState?.entered;
  const isMenEntered = location.pathname.startsWith('/senhores') && !!locationState?.entered;

  const handleLogout = () => {
    if (pendingOfflineCount > 0) {
      const confirmed = window.confirm(
        `Você possui ${pendingOfflineCount} lançamento(s) offline ainda não sincronizados. Se sair agora esses dados podem ser perdidos. Deseja continuar?`
      );
      if (!confirmed) return;
    }
    logout();
    navigate('/');
  };
  const handleReturnToAdminPanel = () => { exitAdminView(); navigate('/admin/dashboard'); };
  const handleChurchSelect = (churchId: string) => { selectChurch(churchId); setShowChurchSelector(false); };

  const sedes = availableChurches.filter(c => c.type === 'SEDE');
  const independentCongregations = availableChurches.filter(c => c.type !== 'SEDE' && !availableChurches.some(parent => parent.id === c.parentId));
  const canSwitchChurch = availableChurches.length > 1 && (user.role === 'SUPER_ADM' || user.role === 'PRESIDENTE' || user.role === 'VICE_PRESIDENTE');

  // --- MENU DEFINITIONS ---
  const isMissionsUser = ['PRESIDENTE_MISSOES', 'VICE_MISSOES', 'TESOUREIRO_MISSOES', 'SECRETARIO_MISSOES'].includes(user.role);
  const isYouthUser = ['LIDER_JOVENS', 'TESOUREIRO_JOVENS'].includes(user.role);
  const isChildrenUser = ['LIDER_CRIANCAS', 'TESOUREIRO_CRIANCAS'].includes(user.role);
  const isLadiesUser = ['LIDER_SENHORAS', 'TESOUREIRO_SENHORAS'].includes(user.role);
  const isMenUser = ['LIDER_SENHORES', 'TESOUREIRO_SENHORES'].includes(user.role);

  interface MenuItem {
      label: string;
      icon: any;
      path: string;
      roles: string[];
      state?: any;
  }

  const generalMenuItems: MenuItem[] = [
    { label: t('nav.dashboard'), icon: LayoutDashboard, path: '/dashboard', roles: ['ALL'] },
    { label: t('nav.congregations'), icon: Network, path: '/congregacoes', roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE'] },
    { label: t('nav.departments'), icon: LayoutIcon, path: '/departamentos', roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE'] },
    { label: t('nav.finance'), icon: Wallet, path: '/financeiro', roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO'] },
    { label: t('nav.campaigns'), icon: Megaphone, path: '/campanhas', roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO'] },
    { label: t('nav.members'), icon: UsersIcon, path: '/membros', roles: ['ALL'] },
    { label: t('nav.letters'), icon: Mail, path: '/cartas', roles: ['ALL'] },
    { label: t('nav.minutes'), icon: FileText, path: '/atas', roles: ['ALL'] },
    { label: t('nav.events'), icon: Calendar, path: '/eventos', roles: ['ALL'] },
    { label: t('nav.infrastructure'), icon: Building2, path: '/infraestrutura', roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO'] },
    { label: t('nav.reports'), icon: FileText, path: '/relatorios', roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO'] },
    { label: t('nav.users'), icon: ShieldCheck, path: '/usuarios', roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE'] },
    { label: t('nav.settings'), icon: Settings, path: '/configuracoes', roles: ['SUPER_ADM', 'PRESIDENTE', 'DIRIGENTE'] },
    { label: 'Pagamentos do Sistema', icon: CreditCard, path: '/faturamento', roles: ['PRESIDENTE', 'VICE_PRESIDENTE', 'TESOUREIRO'] },
  ];

  const missionsMenuItems: MenuItem[] = [
      { label: t('nav.dashboard'), icon: LayoutDashboard, path: '/missoes', state: { activeTab: 'DASHBOARD', entered: true }, roles: ['ALL'] },
      { label: t('nav.launches'), icon: DollarSign, path: '/missoes', state: { activeTab: 'LANCAMENTOS', entered: true }, roles: ['ALL'] },
      { label: t('nav.missionReports'), icon: FileText, path: '/missoes', state: { activeTab: 'RELATORIOS', entered: true }, roles: ['ALL'] },
      { label: t('nav.generateBooklets'), icon: BookOpen, path: '/missoes', state: { activeTab: 'CARNES', entered: true }, roles: ['ALL'] },
      { label: t('nav.configModel'), icon: Settings, path: '/missoes', state: { activeTab: 'CONFIG_MODELO', entered: true }, roles: ['ALL'] },
      { label: t('nav.team'), icon: Users, path: '/missoes', state: { activeTab: 'EQUIPE', entered: true }, roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'PRESIDENTE_MISSOES', 'VICE_MISSOES'] }
  ];

  const youthMenuItems: MenuItem[] = [
      { label: t('nav.dashboard'), icon: LayoutDashboard, path: '/jovens', state: { activeTab: 'DASHBOARD', entered: true }, roles: ['ALL'] },
      { label: t('nav.youthCash'), icon: DollarSign, path: '/jovens', state: { activeTab: 'CAIXA', entered: true }, roles: ['ALL'] },
      { label: t('nav.reports'), icon: FileText, path: '/jovens', state: { activeTab: 'RELATORIOS', entered: true }, roles: ['ALL'] },
      { label: t('nav.booklets'), icon: BookOpen, path: '/jovens', state: { activeTab: 'CARNES', entered: true }, roles: ['ALL'] },
      { label: t('nav.configModel'), icon: Settings, path: '/jovens', state: { activeTab: 'CONFIG_MODELO', entered: true }, roles: ['ALL'] },
      { label: t('nav.members'), icon: UsersIcon, path: '/jovens', state: { activeTab: 'MEMBROS', entered: true }, roles: ['ALL'] },
      { label: t('nav.team'), icon: Users, path: '/jovens', state: { activeTab: 'EQUIPE', entered: true }, roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'LIDER_JOVENS'] }
  ];

  const childrenMenuItems: MenuItem[] = [
      { label: t('nav.dashboard'), icon: LayoutDashboard, path: '/criancas', state: { activeTab: 'DASHBOARD', entered: true }, roles: ['ALL'] },
      { label: t('nav.childrenCash'), icon: DollarSign, path: '/criancas', state: { activeTab: 'CAIXA', entered: true }, roles: ['ALL'] },
      { label: t('nav.reports'), icon: FileText, path: '/criancas', state: { activeTab: 'RELATORIOS', entered: true }, roles: ['ALL'] },
      { label: t('nav.members'), icon: UsersIcon, path: '/criancas', state: { activeTab: 'MEMBROS', entered: true }, roles: ['ALL'] },
      { label: t('nav.team'), icon: Users, path: '/criancas', state: { activeTab: 'EQUIPE', entered: true }, roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'LIDER_CRIANCAS'] }
  ];

  const ladiesMenuItems: MenuItem[] = [
      { label: t('nav.dashboard'), icon: LayoutDashboard, path: '/senhoras', state: { activeTab: 'DASHBOARD', entered: true }, roles: ['ALL'] },
      { label: t('nav.ladiesCash'), icon: DollarSign, path: '/senhoras', state: { activeTab: 'CAIXA', entered: true }, roles: ['ALL'] },
      { label: t('nav.reports'), icon: FileText, path: '/senhoras', state: { activeTab: 'RELATORIOS', entered: true }, roles: ['ALL'] },
      { label: t('nav.members'), icon: UsersIcon, path: '/senhoras', state: { activeTab: 'MEMBROS', entered: true }, roles: ['ALL'] },
      { label: t('nav.team'), icon: Users, path: '/senhoras', state: { activeTab: 'EQUIPE', entered: true }, roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'LIDER_SENHORAS'] }
  ];

  const menMenuItems: MenuItem[] = [
      { label: t('nav.dashboard'), icon: LayoutDashboard, path: '/senhores', state: { activeTab: 'DASHBOARD', entered: true }, roles: ['ALL'] },
      { label: t('nav.menCash'), icon: DollarSign, path: '/senhores', state: { activeTab: 'CAIXA', entered: true }, roles: ['ALL'] },
      { label: t('nav.reports'), icon: FileText, path: '/senhores', state: { activeTab: 'RELATORIOS', entered: true }, roles: ['ALL'] },
      { label: t('nav.members'), icon: UsersIcon, path: '/senhores', state: { activeTab: 'MEMBROS', entered: true }, roles: ['ALL'] },
      { label: t('nav.team'), icon: Users, path: '/senhores', state: { activeTab: 'EQUIPE', entered: true }, roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'LIDER_SENHORES'] }
  ];

  const superAdminMenuItems: MenuItem[] = [
    { label: t('nav.masterPanel'), icon: Building, path: '/admin/dashboard', roles: ['SUPER_ADM'] },
  ];

  // LOGICA DE FILTRAGEM
  let itemsToRender: MenuItem[] = [];

  if (isSuperAdminGlobal) itemsToRender = superAdminMenuItems;
  else if (isMissionsUser) itemsToRender = missionsMenuItems;
  else if (isYouthUser) itemsToRender = youthMenuItems;
  else if (isChildrenUser) itemsToRender = childrenMenuItems;
  else if (isLadiesUser) itemsToRender = ladiesMenuItems;
  else if (isMenUser) itemsToRender = menMenuItems;
  else if (isMissionsEntered) itemsToRender = [...missionsMenuItems, { label: t('common.backToGeneral'), icon: ArrowLeft, path: '/departamentos', roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE'] }, { label: t('common.backToGeneral'), icon: ArrowLeft, path: '/dashboard', roles: ['ALL'] }]; 
  else if (isYouthEntered) itemsToRender = [...youthMenuItems, { label: t('common.backToGeneral'), icon: ArrowLeft, path: '/departamentos', roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE'] }, { label: t('common.backToGeneral'), icon: ArrowLeft, path: '/dashboard', roles: ['ALL'] }];
  else if (isChildrenEntered) itemsToRender = [...childrenMenuItems, { label: t('common.backToGeneral'), icon: ArrowLeft, path: '/departamentos', roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE'] }, { label: t('common.backToGeneral'), icon: ArrowLeft, path: '/dashboard', roles: ['ALL'] }];
  else if (isLadiesEntered) itemsToRender = [...ladiesMenuItems, { label: t('common.backToGeneral'), icon: ArrowLeft, path: '/departamentos', roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE'] }, { label: t('common.backToGeneral'), icon: ArrowLeft, path: '/dashboard', roles: ['ALL'] }];
  else if (isMenEntered) itemsToRender = [...menMenuItems, { label: t('common.backToGeneral'), icon: ArrowLeft, path: '/departamentos', roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE'] }, { label: t('common.backToGeneral'), icon: ArrowLeft, path: '/dashboard', roles: ['ALL'] }];
  else itemsToRender = generalMenuItems;

  const backLabel = t('common.backToGeneral');
  const visibleMenuItems = itemsToRender.filter(item => {
    if (item.path === '/congregacoes' && currentChurch?.type !== 'SEDE') return false;
    // 'Pagamentos do Sistema' aparece SOMENTE no painel da SEDE.
    if (item.path === '/faturamento' && currentChurch?.type !== 'SEDE') return false;
    if (item.path === '/departamentos' && item.label === backLabel && !['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE'].includes(user.role)) return false;
    if (item.path === '/dashboard' && item.label === backLabel && ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE'].includes(user.role)) return false;

    return item.roles.includes('ALL') || item.roles.includes(user.role);
  });

  // Dynamic Header Colors
  let headerColorClass = 'bg-black/20';
  if (isMissionsEntered || isMissionsUser) headerColorClass = 'bg-teal-900/30';
  else if (isYouthEntered || isYouthUser) headerColorClass = 'bg-orange-900/30';
  else if (isChildrenEntered || isChildrenUser) headerColorClass = 'bg-blue-900/30';
  else if (isLadiesEntered || isLadiesUser) headerColorClass = 'bg-pink-900/30';
  else if (isMenEntered || isMenUser) headerColorClass = 'bg-indigo-900/30';

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden transition-colors duration-300">
      
      {isMobileOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />}

      <button className={`md:hidden fixed top-2 left-2 z-50 p-2 rounded-full shadow-xl transition-colors ${isMobileOpen ? 'bg-white text-brand-black' : 'bg-brand-black text-white'}`} onClick={() => setIsMobileOpen(!isMobileOpen)}>
        {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <aside 
        className={`fixed md:relative z-40 h-full flex flex-col shadow-2xl transition-all duration-300 ease-in-out bg-[#0f0f0f] text-white border-r border-gray-800 ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'} ${isDesktopHovered ? 'md:w-72' : 'md:w-20'}`}
        onMouseEnter={() => setIsDesktopHovered(true)}
        onMouseLeave={() => { setIsDesktopHovered(false); setShowChurchSelector(false); }}
      >
        <div className={`h-16 md:h-20 flex items-center justify-center border-b border-gray-800 shrink-0 overflow-hidden px-2 transition-all duration-300 ${headerColorClass}`}>
           {isSuperAdminGlobal ? (
             isExpanded ? <span className="text-xl font-bold text-brand-orange tracking-wider animate-fade-in-down">SUPER ADM</span> : <span className="text-xl font-bold text-brand-orange">SA</span>
           ) : currentChurch ? (
             <div className={`flex items-center transition-all duration-300 ${isExpanded ? 'justify-start w-full px-2' : 'justify-center'}`}>
                {currentChurch.logoUrl ? (
                    <img src={currentChurch.logoUrl} alt="Logo" className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border-2 border-gray-700 bg-white shrink-0"/>
                ) : (
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-brand-orange to-red-600 flex items-center justify-center text-white font-bold text-xs md:text-sm shrink-0 shadow-lg border border-gray-700">
                        {currentChurch.name.substring(0, 2).toUpperCase()}
                    </div>
                )}
                {isExpanded && (
                    <div className="ml-3 overflow-hidden animate-fade-in">
                        <span className="block font-bold text-gray-100 text-sm truncate leading-tight" title={currentChurch.name}>{currentChurch.name}</span>
                        <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                            {isYouthUser || isYouthEntered ? t('nav.depYouth') : 
                             isMissionsUser || isMissionsEntered ? t('nav.depMissions') :
                             isChildrenUser || isChildrenEntered ? t('nav.depChildren') :
                             isLadiesUser || isLadiesEntered ? t('nav.depLadies') :
                             currentChurch.type}
                        </span>
                    </div>
                )}
             </div>
           ) : (
             isExpanded ? <span className="text-xl font-bold text-brand-orange tracking-wider">IgrejaApp</span> : <span className="text-xl font-bold text-brand-orange">IA</span>
           )}
        </div>

        <div className="flex-1 overflow-y-auto py-4 overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-700">
          <nav className="space-y-1 px-3">
            {visibleMenuItems.map((item) => {
              let isActive = false;
              if (item.state?.activeTab) {
                  const currentActiveTab = (location.state as any)?.activeTab || 'DASHBOARD';
                  isActive = location.pathname === item.path && currentActiveTab === item.state.activeTab;
              } else {
                  isActive = location.pathname === item.path;
              }
              const isBackBtn = item.icon === ArrowLeft;
              
              let activeClass = 'bg-gradient-to-r from-brand-orange to-red-600 text-white shadow-lg';
              if (isMissionsEntered || isMissionsUser) activeClass = 'bg-gradient-to-r from-teal-600 to-teal-800 text-white shadow-lg';
              if (isYouthEntered || isYouthUser) activeClass = 'bg-gradient-to-r from-orange-500 to-orange-700 text-white shadow-lg';
              if (isChildrenEntered || isChildrenUser) activeClass = 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg';
              if (isLadiesEntered || isLadiesUser) activeClass = 'bg-gradient-to-r from-pink-500 to-pink-700 text-white shadow-lg';

              return (
              <React.Fragment key={item.label}>
                {isBackBtn && <div className="border-t border-gray-800 my-2"></div>}
                <Link to={item.path} state={item.state} onClick={() => setIsMobileOpen(false)} className={`flex items-center px-3 py-3 rounded-lg transition-all whitespace-nowrap group ${isActive ? activeClass : (isBackBtn ? 'text-blue-400 hover:bg-blue-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white')}`} title={!isExpanded ? item.label : ''}>
                  <item.icon size={22} className={`shrink-0 ${isActive ? 'text-white' : (isBackBtn ? 'text-blue-400' : 'text-gray-500 group-hover:text-white')}`} />
                  <span className={`ml-3 font-medium transition-all duration-200 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 hidden'}`}>{item.label}</span>
                </Link>
              </React.Fragment>
            )})}
          </nav>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-gray-800 bg-[#0a0a0a]">
            {/* ... (Existing footer logic for User Profile and Church Switcher) ... */}
            <div className="relative">
                {isExpanded ? (
                    <button onClick={() => canSwitchChurch && setShowChurchSelector(!showChurchSelector)} className={`w-full text-left rounded-r-lg border-l-4 border-red-600 bg-gray-800/80 p-3 transition-all duration-200 group relative overflow-hidden ${canSwitchChurch ? 'hover:bg-gray-800 cursor-pointer' : 'cursor-default'}`}>
                         <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-red-600/10 blur-xl rounded-full pointer-events-none"></div>
                         <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">{isSuperAdminGlobal ? t('common.globalMode') : t('common.user')}</p>
                         <div className="flex justify-between items-center mb-2">
                             <div className="flex items-center">
                                 {userPhotoUrl && <img src={userPhotoUrl} alt="User" className="w-5 h-5 rounded-full mr-2 object-cover border border-gray-600"/>}
                                 <h4 className="text-white font-bold text-sm truncate pr-2 leading-tight">{user.name}</h4>
                             </div>
                             {canSwitchChurch && <ChevronDown size={14} className={`text-gray-500 transition-transform duration-300 ${showChurchSelector ? 'rotate-180 text-brand-orange' : ''}`}/>}
                         </div>
                         <div className="flex items-center pt-2 border-t border-gray-700/50">
                             <div className="relative mr-2">
                               <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]'}`}></div>
                             </div>
                             <p className="text-xs text-brand-orange font-medium truncate flex-1 capitalize">{user.role.replace('_', ' ').toLowerCase()}</p>
                             {!isOnline && <WifiOff size={11} className="text-orange-400 shrink-0" title="Offline" />}
                             {isOnline && pendingOfflineCount > 0 && <Wifi size={11} className="text-orange-400 shrink-0 animate-pulse" title="Sincronizando" />}
                         </div>
                    </button>
                ) : (
                    <div className="flex justify-center">
                        <div className="w-10 h-10 rounded-full bg-gray-800 border-2 border-red-600 flex items-center justify-center text-white font-bold text-sm shadow-lg relative cursor-default overflow-hidden" title={user.name}>
                            {userPhotoUrl ? <img src={userPhotoUrl} alt={user.name} className="w-full h-full object-cover" /> : user.name.charAt(0)}
                            <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-gray-900 rounded-full z-10 ${isOnline ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                        </div>
                    </div>
                )}
                {showChurchSelector && isExpanded && (
                    <div className="absolute bottom-full left-0 w-full mb-3 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-2xl overflow-hidden z-50 animate-fade-in-up">
                        <div className="px-3 py-2 bg-black/40 border-b border-gray-700 text-[10px] text-gray-500 font-bold uppercase tracking-wider">{t('common.switchUnit')}</div>
                        <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
                            {sedes.map(sede => (
                                <React.Fragment key={sede.id}>
                                    <ChurchOption church={sede} currentChurch={currentChurch} onSelect={handleChurchSelect} />
                                    {availableChurches.filter(child => child.parentId === sede.id).sort((a, b) => a.name.localeCompare(b.name)).map(child => (
                                            <ChurchOption key={child.id} church={child} isChild={true} currentChurch={currentChurch} onSelect={handleChurchSelect} />
                                    ))}
                                </React.Fragment>
                            ))}
                            {independentCongregations.length > 0 && independentCongregations.map(cong => (
                               <ChurchOption key={cong.id} church={cong} currentChurch={currentChurch} onSelect={handleChurchSelect} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {isExpanded && (
              <div className="relative mt-3">
                <button
                  onClick={() => setShowLangSelector(!showLangSelector)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-800/60 hover:bg-gray-700/60 text-gray-400 hover:text-white rounded-lg transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-gray-500"/>
                    <span className="text-xs font-medium">
                      {SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)?.flag}{' '}
                      {SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)?.label || t('language.selector')}
                    </span>
                  </div>
                  <ChevronDown size={12} className={`transition-transform duration-200 ${showLangSelector ? 'rotate-180' : ''}`}/>
                </button>
                {showLangSelector && (
                  <div className="absolute bottom-full left-0 w-full mb-2 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-2xl overflow-hidden z-50">
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 hover:bg-gray-700 transition-colors ${i18n.language === lang.code ? 'text-brand-orange bg-gray-800' : 'text-gray-300'}`}
                      >
                        <span className="text-base">{lang.flag}</span>
                        <span className="font-medium">{lang.label}</span>
                        {i18n.language === lang.code && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-orange"/>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button onClick={handleLogout} className={`flex items-center w-full mt-3 px-3 py-2 text-red-400 hover:text-white hover:bg-red-600/20 rounded-lg transition-all duration-200 group ${!isExpanded && 'justify-center px-0'}`} title={!isExpanded ? t('common.logout') : ''}>
                <LogOut size={20} className="shrink-0 group-hover:scale-110 transition-transform" />
                <span className={`ml-3 text-sm font-medium whitespace-nowrap transition-all duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>{t('common.logout')}</span>
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 relative">
        <div className="fixed top-2 right-3 z-40">
          <NotificationCenter />
        </div>
        {isGhostMode && (
          <div className="bg-brand-yellow text-brand-black px-4 py-2 text-xs md:text-base flex justify-between items-center shadow-md z-10 pl-14 md:pl-6">
            <div className="flex items-center font-bold">
              <EyeOff className="mr-2" size={16}/>
              <span className="hidden sm:inline">{t('superAdmin.ghostMode')} {currentChurch?.name}</span>
              <span className="sm:hidden">{t('superAdmin.ghostModeShort')}: {currentChurch?.name}</span>
            </div>
            <button onClick={handleReturnToAdminPanel} className="bg-black text-white px-3 py-1 rounded text-xs hover:bg-gray-800 font-bold whitespace-nowrap">{t('superAdmin.exit')}</button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 pt-16 sm:p-6 lg:p-8 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
           {children}
        </div>
      </main>
    </div>
  );
};