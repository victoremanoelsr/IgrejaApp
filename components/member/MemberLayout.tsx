import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  Building,
} from 'lucide-react';

interface MemberLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { to: '/portal/dashboard', icon: LayoutDashboard, label: 'Início' },
  { to: '/portal/financeiro', icon: DollarSign, label: 'Financeiro' },
  { to: '/portal/carnets', icon: BookOpen, label: 'Carnês' },
  { to: '/portal/documentos', icon: FileText, label: 'Documentos' },
  { to: '/portal/perfil', icon: User, label: 'Perfil' },
];

export const MemberLayout: React.FC<MemberLayoutProps> = ({ children }) => {
  const { session, logout } = useMember();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopHovered, setIsDesktopHovered] = useState(false);

  if (!session) return null;

  const isExpanded = isMobileOpen || isDesktopHovered;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const member = session.member;
  const church = session.church;

  const initials = member.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const churchInitials = church.name
    ? church.name.substring(0, 2).toUpperCase()
    : 'IA';

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
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
          isMobileOpen ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'
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
        onMouseLeave={() => setIsDesktopHovered(false)}
      >
        {/* Header */}
        <div className="h-16 md:h-20 flex items-center justify-center border-b border-gray-800 shrink-0 overflow-hidden px-2 transition-all duration-300 bg-orange-900/20">
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

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-4 overflow-x-hidden">
          <nav className="space-y-1 px-3">
            {navItems.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname === to;
              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setIsMobileOpen(false)}
                  title={!isExpanded ? label : ''}
                  className={`flex items-center px-3 py-3 rounded-lg transition-all whitespace-nowrap group ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
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
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#0a0a0a]">
          {isExpanded ? (
            <div className="rounded-lg border-l-4 border-orange-500 bg-gray-800/80 p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">
                Membro
              </p>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {member.photo ? (
                    <img
                      src={member.photo}
                      alt={member.name}
                      className="w-5 h-5 rounded-full object-cover border border-gray-600 shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                      {initials}
                    </div>
                  )}
                  <h4 className="text-white font-bold text-sm truncate leading-tight">
                    {member.name.split(' ').slice(0, 2).join(' ')}
                  </h4>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sair"
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors shrink-0 ml-1"
                >
                  <LogOut size={14} />
                </button>
              </div>
              <div className="flex items-center pt-2 border-t border-gray-700/50">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] mr-2 shrink-0" />
                <p className="text-xs text-orange-400 font-medium truncate">
                  {member.status || 'ATIVO'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-10 h-10 rounded-full border-2 border-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-lg overflow-hidden cursor-default"
                title={member.name}
              >
                {member.photo ? (
                  <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs">{initials}</span>
                )}
              </div>
              <button
                onClick={handleLogout}
                title="Sair"
                className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900">
        <div className="p-4 md:p-8 pt-12 md:pt-8">{children}</div>
      </main>
    </div>
  );
};
