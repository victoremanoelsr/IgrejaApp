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
  Home
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

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

  // --- SORT CHURCHES: SEDE FIRST ---
  // This ensures Presidents see their HQ at the top to easily return
  const sortedChurches = [...availableChurches].sort((a, b) => {
    if (a.type === 'SEDE') return -1; // Sede comes first
    if (b.type === 'SEDE') return 1;
    return a.name.localeCompare(b.name); // Others alphabetical
  });

  // Check if selector should be active
  // Active for: Super Admin (Ghost Mode) OR Presidents/Vice with multiple churches
  const canSwitchChurch = (availableChurches.length > 1 && !isSuperAdminGlobal && !isGhostMode) || ((user.role === 'PRESIDENTE' || user.role === 'VICE_PRESIDENTE') && availableChurches.length > 1);

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
            ${isSuperAdminGlobal ? 'bg-brand-dark' : 'bg-brand-black'} text-white
            ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
            ${isDesktopHovered ? 'md:w-64' : 'md:w-20'}
        `}
        onMouseEnter={() => setIsDesktopHovered(true)}
        onMouseLeave={() => setIsDesktopHovered(false)}
      >
        {/* Header Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-800 shrink-0 overflow-hidden whitespace-nowrap">
           {isExpanded ? (
             <span className="text-xl font-bold text-brand-orange tracking-wider animate-fade-in-down">
               {isSuperAdminGlobal ? 'SUPER ADM' : 'IgrejaApp'}
             </span>
           ) : (
             <span className="text-xl font-bold text-brand-orange">{isSuperAdminGlobal ? 'S' : 'IA'}</span>
           )}
        </div>

        {/* Navigation Links (Middle) */}
        <div className="flex-1 overflow-y-auto py-4 overflow-x-hidden">
          <nav className="space-y-1 px-2">
            {visibleMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)} // Close on mobile click
                className={`flex items-center px-4 py-3 rounded-md transition-colors whitespace-nowrap ${
                  location.pathname === item.path 
                    ? 'bg-brand-orange text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                title={!isExpanded ? item.label : ''}
              >
                <item.icon size={20} className="shrink-0" />
                <span className={`ml-3 font-medium transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
                    {item.label}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Footer (User Card + Logout) */}
        <div className="p-4 border-t border-gray-800 bg-black/10 overflow-hidden">
          
          {/* USER CARD */}
          <div className={`rounded-lg transition-all duration-300 ${isExpanded ? 'p-3 border-l-4 bg-gray-800 mb-4' : 'p-0 mb-2 flex justify-center'} relative ${isSuperAdminGlobal ? 'border-brand-yellow' : 'border-brand-red'}`}>
              
              {isExpanded ? (
                  // EXPANDED STATE
                  canSwitchChurch ? (
                    <div className="relative">
                      <button 
                        onClick={() => setShowChurchSelector(!showChurchSelector)}
                        className="w-full text-left flex justify-between items-center focus:outline-none group"
                      >
                        <div className="overflow-hidden">
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest">{currentChurch?.type}</p>
                          <p className="font-semibold text-sm truncate text-white group-hover:text-brand-orange transition-colors">
                            {currentChurch?.name}
                          </p>
                        </div>
                        <ChevronDown size={16} className="text-gray-400"/>
                      </button>

                      {/* Dropdown for Church Selection - Shows SEDE and all Congregations */}
                      {showChurchSelector && (
                        <div className="absolute bottom-full left-0 w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 mb-2 rounded-md shadow-lg z-50 overflow-hidden ring-1 ring-black ring-opacity-5 max-h-60 overflow-y-auto">
                          {sortedChurches.map(c => (
                            <button
                              key={c.id}
                              onClick={() => {
                                selectChurch(c.id);
                                setShowChurchSelector(false);
                              }}
                              className={`w-full text-left px-3 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 ${c.id === currentChurch?.id ? 'bg-orange-50 dark:bg-gray-700' : ''}`}
                            >
                              <div className="flex items-center">
                                {c.type === 'SEDE' && <Home size={12} className="mr-1 text-brand-red"/>}
                                <span className={`block text-[10px] uppercase font-bold ${c.type === 'SEDE' ? 'text-brand-red' : 'text-gray-400'}`}>
                                  {c.type}
                                </span>
                              </div>
                              <span className={`font-medium ${c.id === currentChurch?.id ? 'text-brand-orange' : 'text-gray-700 dark:text-gray-300'}`}>
                                {c.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-gray-400">{isSuperAdminGlobal ? 'Modo' : currentChurch?.type || 'Unidade'}</p>
                      <p className="font-semibold text-sm truncate">{isSuperAdminGlobal ? 'Gestão Global' : currentChurch?.name}</p>
                    </>
                  )
              ) : (
                  // COLLAPSED STATE (Icon only or initials)
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 border border-gray-600 cursor-default" title={user.name}>
                      {user.name.charAt(0)}
                  </div>
              )}
              
              {isExpanded && (
                <p className="text-xs text-brand-orange mt-2 pt-2 border-t border-gray-700 truncate flex items-center">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2 shrink-0"></span>
                    {user.name}
                </p>
              )}
            </div>

          <button 
            onClick={handleLogout} 
            className={`flex items-center w-full px-4 py-2 text-red-400 hover:bg-gray-800 rounded-md transition-colors ${!isExpanded && 'justify-center px-0'}`}
            title={!isExpanded ? 'Sair' : ''}
          >
            <LogOut size={20} className="shrink-0" />
            <span className={`ml-3 whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>Sair</span>
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 pt-14 sm:p-6 lg:p-8 md:pt-8">
           {children}
        </div>
      </main>
    </div>
  );
};