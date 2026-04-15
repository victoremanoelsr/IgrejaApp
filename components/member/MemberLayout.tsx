import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useMember } from '../../contexts/MemberContext';
import {
  Home,
  DollarSign,
  BookOpen,
  FileText,
  User,
  LogOut,
} from 'lucide-react';

interface MemberLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { to: '/portal/dashboard', icon: Home, label: 'Início' },
  { to: '/portal/financeiro', icon: DollarSign, label: 'Financeiro' },
  { to: '/portal/carnets', icon: BookOpen, label: 'Carnês' },
  { to: '/portal/documentos', icon: FileText, label: 'Documentos' },
  { to: '/portal/perfil', icon: User, label: 'Perfil' },
];

export const MemberLayout: React.FC<MemberLayoutProps> = ({ children }) => {
  const { session, logout } = useMember();
  const navigate = useNavigate();

  if (!session) return null;

  const handleLogout = () => {
    logout();
    navigate('/portal/login');
  };

  const memberName = session.member.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  const initials = session.member.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col max-w-md mx-auto relative">
      {/* Header */}
      <header className="bg-slate-800/90 backdrop-blur-sm border-b border-slate-700/60 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3 min-w-0">
          {session.church.logoUrl ? (
            <img
              src={session.church.logoUrl}
              alt="Logo"
              className="w-8 h-8 rounded-full object-cover border border-slate-600"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center shrink-0">
              <span className="text-orange-400 text-xs font-bold">
                {session.church.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-white text-xs font-bold truncate">{session.church.name}</p>
            <p className="text-slate-500 text-[10px]">Portal do Membro</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {session.member.photo ? (
            <img
              src={session.member.photo}
              alt={memberName}
              className="w-8 h-8 rounded-full object-cover border-2 border-orange-500/40"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <span className="text-white text-xs font-extrabold">{initials}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
            title="Sair"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-800/95 backdrop-blur-sm border-t border-slate-700/60 z-40">
        <div className="flex">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 transition-all ${
                  isActive
                    ? 'text-orange-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1 rounded-lg transition-all ${
                      isActive ? 'bg-orange-500/15' : ''
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <span className="text-[9px] font-semibold tracking-wide">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
