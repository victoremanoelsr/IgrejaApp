
import React, { useState } from 'react';
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
  CornerDownRight
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Church } from '../types';

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
  const { user, logout, currentChurch, availableChurches, selectChurch, exitAdminView } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  
  // States for responsive behavior
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopHovered, setIsDesktopHovered] = useState(false);
  const [showChurchSelector, setShowChurchSelector] = useState(false);
  
  if (!user) return <>{children}</>;

  // Super Admin GLOBAL mode (not viewing a specific church)
  const isSuperAdminGlobal = user.role === 'SUPER_ADM' && !currentChurch; 
  // Ghost mode
  const isGhostMode = user.role === 'SUPER_ADM' && currentChurch;

  // Helper to determine if menu is expanded (Mobile Open OR Desktop Hover)
  const isExpanded = isMobileOpen || isDesktopHovered;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleReturnToAdminPanel = () => {
    exitAdminView();
    navigate('/admin/dashboard');
  };

  const handleChurchSelect = (churchId: string) => {
    selectChurch(churchId);
    setShowChurchSelector(false);
  };

  // --- HIERARCHY LOGIC FOR SELECTOR ---
  // 1. Find all Sedes (Headquarters)
  const sedes = availableChurches.filter(c => c.type === 'SEDE');
  
  // 2. Find congregations that might not have a parent in the list (Orphans/Independents in view context)
  const independentCongregations = availableChurches.filter(c => 
    c.type !== 'SEDE' && !availableChurches.some(parent => parent.id === c.parentId)
  );

  // Check if selector should be active (Logic: President/Vice with branches OR SuperAdmin)
  const canSwitchChurch = (availableChurches.length > 1 && !isSuperAdminGlobal) || 
                          ((user.role === 'PRESIDENTE' || user.role === 'VICE_PRESIDENTE') && availableChurches.length > 1);

  // --- MENU DEFINITIONS ---

  const churchMenuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['ALL'] },
    // Apenas Sede vê o menu de Congregações
    { label: 'Congregações', icon: Network, path: '/congregacoes', roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE'] },
    { label: 'Financeiro', icon: Wallet, path: '/financeiro', roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO'] },
    { label: 'Campanhas', icon: Megaphone, path: '/campanhas', roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO'] },
    { label: 'Membros', icon: UsersIcon, path: '/membros', roles: ['ALL'] },
    { label: 'Atas', icon: FileText, path: '/atas', roles: ['ALL'] },
    { label: 'Eventos', icon: Calendar, path: '/eventos', roles: ['ALL'] },
    { label: 'Relatórios', icon: FileText, path: '/relatorios', roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE', 'TESOUREIRO', 'SECRETARIO'] },
    { label: 'Usuários', icon: ShieldCheck, path: '/usuarios', roles: ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'DIRIGENTE'] },
    { label: 'Configurações', icon: Settings, path: '/configuracoes', roles: ['SUPER_ADM', 'PRESIDENTE', 'DIRIGENTE'] },
  ];

  const superAdminMenuItems = [
    { label: 'Painel Master', icon: Building, path: '/admin/dashboard', roles: ['SUPER_ADM'] },
  ];

  let itemsToRender = isSuperAdminGlobal ? superAdminMenuItems : churchMenuItems;

  const visibleMenuItems = itemsToRender.filter(item => {
    // Special check for "Congregações": Only show if current church is SEDE
    if (item.label === 'Congregações' && currentChurch?.type !== 'SEDE') return false;

    return item.roles.includes('ALL') || item.roles.includes(user.role);
  });

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden transition-colors duration-300">
      
      {/* MOBILE OVERLAY (Dark Background when menu is open) */}
      {isMobileOpen && (
        <div 
            className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* MOBILE TOGGLE BUTTON (Floating) */}
      <button 
        className={`md:hidden fixed top-3 left-3 z-50 p-2 rounded-full shadow-xl transition-colors ${isMobileOpen ? 'bg-white text-brand-black' : 'bg-brand-black text-white'}`}
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside 
        className={`
            fixed md:relative z-40 h-full flex flex-col shadow-2xl transition-all duration-300 ease-in-out
            bg-[#0f0f0f] text-white border-r border-gray-800
            ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
            ${isDesktopHovered ? 'md:w-72' : 'md:w-20'}
        `}
        onMouseEnter={() => setIsDesktopHovered(true)}
        onMouseLeave={() => {
            setIsDesktopHovered(false);
            setShowChurchSelector(false); // Fecha o dropdown ao sair do menu
        }}
      >
        {/* Header Logo & Church Name */}
        <div className="h-20 flex items-center justify-center border-b border-gray-800 shrink-0 overflow-hidden bg-black/20 px-2 transition-all duration-300">
           {isSuperAdminGlobal ? (
             isExpanded ? (
               <span className="text-xl font-bold text-brand-orange tracking-wider animate-fade-in-down">SUPER ADM</span>
             ) : (
               <span className="text-xl font-bold text-brand-orange">SA</span>
             )
           ) : currentChurch ? (
             <div className={`flex items-center transition-all duration-300 ${isExpanded ? 'justify-start w-full px-2' : 'justify-center'}`}>
                {/* LOGO DA IGREJA */}
                {currentChurch.logoUrl ? (
                    <img 
                        src={currentChurch.logoUrl} 
                        alt="Logo" 
                        className="w-10 h-10 rounded-full object-cover border-2 border-gray-700 bg-white shrink-0"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-orange to-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg border border-gray-700">
                        {currentChurch.name.substring(0, 2).toUpperCase()}
                    </div>
                )}

                {/* NOME DA IGREJA (Aparece apenas quando expandido) */}
                {isExpanded && (
                    <div className="ml-3 overflow-hidden animate-fade-in">
                        <span className="block font-bold text-gray-100 text-sm truncate leading-tight" title={currentChurch.name}>
                            {currentChurch.name}
                        </span>
                        <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                            {currentChurch.type}
                        </span>
                    </div>
                )}
             </div>
           ) : (
             // FALLBACK (Se não houver igreja e não for Super Admin - caso raro)
             isExpanded ? (
                 <span className="text-xl font-bold text-brand-orange tracking-wider">IgrejaApp</span>
             ) : (
                 <span className="text-xl font-bold text-brand-orange">IA</span>
             )
           )}
        </div>

        {/* Navigation Links (Middle) */}
        <div className="flex-1 overflow-y-auto py-4 overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-700">
          <nav className="space-y-1 px-3">
            {visibleMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)} // Close on mobile click
                className={`flex items-center px-3 py-3 rounded-lg transition-all whitespace-nowrap group ${
                  location.pathname === item.path 
                    ? 'bg-gradient-to-r from-brand-orange to-red-600 text-white shadow-lg' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
                title={!isExpanded ? item.label : ''}
              >
                <item.icon size={22} className={`shrink-0 ${location.pathname === item.path ? 'text-white' : 'text-gray-500 group-hover:text-white'}`} />
                <span className={`ml-3 font-medium transition-all duration-200 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 hidden'}`}>
                    {item.label}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        {/* FOOTER: CHURCH SELECTOR / USER INFO */}
        <div className="p-4 border-t border-gray-800 bg-[#0a0a0a]">
            
            {/* O SELETOR EM SI */}
            <div className="relative">
                {isExpanded ? (
                    /* VISÃO EXPANDIDA (CARD COMPLETO) */
                    <button 
                        onClick={() => canSwitchChurch && setShowChurchSelector(!showChurchSelector)}
                        className={`w-full text-left rounded-r-lg border-l-4 border-red-600 bg-gray-800/80 p-3 transition-all duration-200 group relative overflow-hidden ${canSwitchChurch ? 'hover:bg-gray-800 cursor-pointer' : 'cursor-default'}`}
                    >
                         {/* Background Glow Effect */}
                         <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-red-600/10 blur-xl rounded-full pointer-events-none"></div>

                         {/* Tipo de Unidade */}
                         <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">
                            {isSuperAdminGlobal ? 'MODO GLOBAL' : 'USUÁRIO'}
                         </p>
                         
                         {/* Nome do Usuário + Ícone Dropdown */}
                         <div className="flex justify-between items-center mb-2">
                             <h4 className="text-white font-bold text-sm truncate pr-2 leading-tight">
                                {user.name}
                             </h4>
                             {canSwitchChurch && (
                                <ChevronDown size={14} className={`text-gray-500 transition-transform duration-300 ${showChurchSelector ? 'rotate-180 text-brand-orange' : ''}`}/>
                             )}
                         </div>

                         {/* Cargo + Status Online */}
                         <div className="flex items-center pt-2 border-t border-gray-700/50">
                             <div className="relative mr-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
                             </div>
                             <p className="text-xs text-brand-orange font-medium truncate flex-1 capitalize">
                                {user.role.replace('_', ' ').toLowerCase()}
                             </p>
                         </div>
                    </button>
                ) : (
                    /* VISÃO COLAPSADA (ÍCONE APENAS) */
                    <div className="flex justify-center">
                        <div className="w-10 h-10 rounded-full bg-gray-800 border-2 border-red-600 flex items-center justify-center text-white font-bold text-sm shadow-lg relative cursor-default" title={user.name}>
                            {user.name.charAt(0)}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full"></div>
                        </div>
                    </div>
                )}

                {/* MENU DROPDOWN (FLUTUANTE ACIMA) */}
                {showChurchSelector && isExpanded && (
                    <div className="absolute bottom-full left-0 w-full mb-3 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-2xl overflow-hidden z-50 animate-fade-in-up">
                        <div className="px-3 py-2 bg-black/40 border-b border-gray-700 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                            Trocar Unidade
                        </div>
                        <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
                            
                            {/* 1. Render Hierarchy (Sedes + their children) */}
                            {sedes.map(sede => (
                                <React.Fragment key={sede.id}>
                                    {/* Parent SEDE */}
                                    <ChurchOption 
                                      church={sede} 
                                      currentChurch={currentChurch}
                                      onSelect={handleChurchSelect}
                                    />

                                    {/* Children CONGREGATIONS */}
                                    {availableChurches
                                        .filter(child => child.parentId === sede.id)
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(child => (
                                            <ChurchOption 
                                              key={child.id} 
                                              church={child} 
                                              isChild={true} 
                                              currentChurch={currentChurch}
                                              onSelect={handleChurchSelect}
                                            />
                                        ))
                                    }
                                </React.Fragment>
                            ))}

                            {/* 2. Render Independent Congregations (Orphans in the list) */}
                            {independentCongregations.length > 0 && (
                                <>
                                   {sedes.length > 0 && <div className="border-t border-gray-800 my-1"></div>}
                                   {independentCongregations.map(cong => (
                                       <ChurchOption 
                                          key={cong.id} 
                                          church={cong} 
                                          currentChurch={currentChurch}
                                          onSelect={handleChurchSelect}
                                       />
                                   ))}
                                </>
                            )}

                        </div>
                    </div>
                )}
            </div>
            
            {/* BOTÃO SAIR */}
            <button 
                onClick={handleLogout} 
                className={`flex items-center w-full mt-3 px-3 py-2 text-red-400 hover:text-white hover:bg-red-600/20 rounded-lg transition-all duration-200 group ${!isExpanded && 'justify-center px-0'}`}
                title={!isExpanded ? 'Sair do Sistema' : ''}
            >
                <LogOut size={20} className="shrink-0 group-hover:scale-110 transition-transform" />
                <span className={`ml-3 text-sm font-medium whitespace-nowrap transition-all duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
                    Sair do Sistema
                </span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 relative">
        
        {/* Ghost Mode Banner */}
        {isGhostMode && (
          <div className="bg-brand-yellow text-brand-black px-6 py-3 flex justify-between items-center shadow-md z-10 pl-16 md:pl-6">
            <div className="flex items-center font-bold">
              <EyeOff className="mr-2" size={20}/>
              <span className="hidden sm:inline">MODO SUPER VISÃO: Acessando {currentChurch?.name}</span>
              <span className="sm:hidden">SUPER VISÃO: {currentChurch?.name}</span>
            </div>
            <button 
              onClick={handleReturnToAdminPanel} 
              className="bg-black text-white px-4 py-1 rounded text-sm hover:bg-gray-800 font-bold whitespace-nowrap"
            >
              Sair
            </button>
          </div>
        )}

        {/* ADJUSTED PADDING FOR MOBILE COMPACTNESS */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 pt-14 sm:p-6 lg:p-8 md:pt-8 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
           {children}
        </div>
      </main>
    </div>
  );
};
