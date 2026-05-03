import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../i18n';
import { useMember } from '../../contexts/MemberContext';
import {
  LayoutDashboard,
  DollarSign,
  BookOpen,
  FileText,
  User,
  LogOut,
  Menu,
  X,
  Globe,
  ChevronDown,
  Calendar,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

const navItems = [
  { to: '/portal/dashboard', icon: LayoutDashboard, label: 'Início' },
  { to: '/portal/financeiro', icon: DollarSign, label: 'Financeiro' },
  { to: '/portal/carnets', icon: BookOpen, label: 'Carnês' },
  { to: '/portal/eventos', icon: Calendar, label: 'Eventos' },
  { to: '/portal/documentos', icon: FileText, label: 'Documentos' },
  { to: '/portal/perfil', icon: User, label: 'Perfil' },
];

interface MemberLayoutProps {
  children: React.ReactNode;
}

export const MemberLayout: React.FC<MemberLayoutProps> = ({ children }) => {
  const { session, logout } = useMember();
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopHovered, setIsDesktopHovered] = useState(false);
  const [showLangSelector, setShowLangSelector] = useState(false);

  if (!session) return null;

  const member = session.member;
  const church = session.church;
  const isExpanded = isMobileOpen || isDesktopHovered;

  const initials = member.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const churchInitials = church.name ? church.name.substring(0, 2).toUpperCase() : 'IA';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('i18n_language', code);
    setShowLangSelector(false);
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile hamburger */}
      <button
        className={`md:hidden fixed top-2 left-2 z-50 p-2 rounded-full shadow-xl transition-colors ${
          isMobileOpen ? 'bg-white text-gray-900' : 'bg-[#0f0f0f] text-white'
        }`}
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-40 h-full flex flex-col shadow-2xl transition-all duration-300 ease-in-out bg-[#0f0f0f] text-white border-r border-gray-800 ${
          isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${isDesktopHovered ? 'md:w-72' : 'md:w-20'}`}
        onMouseEnter={() => setIsDesktopHovered(true)}
        onMouseLeave={() => {
          setIsDesktopHovered(false);
          setShowLangSelector(false);
        }}
      >
        {/* Header — church logo + name */}
        <div className="h-16 md:h-20 flex items-center justify-center border-b border-gray-800 shrink-0 overflow-hidden px-2 transition-all duration-300 bg-black/20">
          <div
            className={`flex items-center transition-all duration-300 ${
              isExpanded ? 'justify-start w-full px-2' : 'justify-center'
            }`}
          >
            {church.logoUrl ? (
              <img
                src={church.logoUrl}
                alt="Logo"
                className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border-2 border-gray-700 bg-white shrink-0"
              />
            ) : (
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-xs md:text-sm shrink-0 shadow-lg border border-gray-700">
                {churchInitials}
              </div>
            )}
            {isExpanded && (
              <div className="ml-3 overflow-hidden">
                <span
                  className="block font-bold text-gray-100 text-sm truncate leading-tight"
                  title={church.name}
                >
                  {church.name}
                </span>
                <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                  Portal do Membro
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-4 overflow-x-hidden">
          <nav className="space-y-1 px-3">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setIsMobileOpen(false)}
                title={!isExpanded ? label : ''}
                className={({ isActive }) =>
                  `flex items-center px-3 py-3 rounded-lg transition-all whitespace-nowrap group ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={22}
                      className={`shrink-0 ${
                        isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'
                      }`}
                    />
                    <span
                      className={`ml-3 font-medium transition-all duration-200 ${
                        isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 hidden'
                      }`}
                    >
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer — member card + language + logout */}
        <div className="p-4 border-t border-gray-800 bg-[#0a0a0a]">
          {/* Member card */}
          {isExpanded ? (
            <div className="rounded-r-lg border-l-4 border-red-600 bg-gray-800/80 p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">
                Membro
              </p>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center min-w-0">
                  {member.photo ? (
                    <img
                      src={member.photo}
                      alt={member.name}
                      className="w-5 h-5 rounded-full mr-2 object-cover border border-gray-600 shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-[9px] font-bold mr-2 shrink-0">
                      {initials}
                    </div>
                  )}
                  <h4 className="text-white font-bold text-sm truncate leading-tight">
                    {member.name.split(' ').slice(0, 2).join(' ')}
                  </h4>
                </div>
              </div>
              <div className="flex items-center pt-2 border-t border-gray-700/50">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] mr-2 shrink-0" />
                <p className="text-xs text-orange-400 font-medium truncate capitalize">
                  {member.status || 'Ativo'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div
                className="w-10 h-10 rounded-full bg-gray-800 border-2 border-red-600 flex items-center justify-center text-white font-bold text-sm shadow-lg cursor-default overflow-hidden"
                title={member.name}
              >
                {member.photo ? (
                  <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs">{initials}</span>
                )}
              </div>
            </div>
          )}

          {/* Language selector */}
          {isExpanded && (
            <div className="relative mt-3">
              <button
                onClick={() => setShowLangSelector(!showLangSelector)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-800/60 hover:bg-gray-700/60 text-gray-400 hover:text-white rounded-lg transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-gray-500" />
                  <span className="text-xs font-medium">
                    {SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language)?.flag}{' '}
                    {SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language)?.label ||
                      'Idioma'}
                  </span>
                </div>
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${showLangSelector ? 'rotate-180' : ''}`}
                />
              </button>
              {showLangSelector && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-2xl overflow-hidden z-50">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 hover:bg-gray-700 transition-colors ${
                        i18n.language === lang.code
                          ? 'text-orange-400 bg-gray-800'
                          : 'text-gray-300'
                      }`}
                    >
                      <span className="text-base">{lang.flag}</span>
                      <span className="font-medium">{lang.label}</span>
                      {i18n.language === lang.code && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`flex items-center w-full mt-3 px-3 py-2 text-red-400 hover:text-white hover:bg-red-600/20 rounded-lg transition-all duration-200 group ${
              !isExpanded ? 'justify-center px-0' : ''
            }`}
            title={!isExpanded ? 'Sair do Sistema' : ''}
          >
            <LogOut size={20} className="shrink-0 group-hover:scale-110 transition-transform" />
            <span
              className={`ml-3 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'
              }`}
            >
              Sair do Sistema
            </span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 relative">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-16 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
